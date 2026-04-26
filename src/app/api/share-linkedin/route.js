import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 * 
 * robust 2026 Edition handler.
 * - Entity Mapping for mentions.
 * - Media-First for Hero Cards.
 * - Crash-proofed with null-checks.
 */
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json({ error: "Unauthorized - Please re-login." }, { status: 401 });
  }

  const linkedinSub = token.linkedinSub || token.userId?.replace("linkedin:", "");
  if (!linkedinSub) return Response.json({ error: "No LinkedIn identity found." }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    commentary = "",
    articleUrl = "",
    articleTitle = "",
    articleDescription = "",
    ogUrl = "",
    voucherUrn = "",
    cleanVoucher = "",
  } = body;

  const safeCommentary = commentary || "";

  // --- Step 1: Asset Handshake (6-attempt poll) ---
  let imageUrn = null;
  try {
    if (ogUrl) {
      const ogRes = await fetch(ogUrl, { signal: AbortSignal.timeout(12000) });
      if (ogRes.ok) {
        const imageBuffer = Buffer.from(await ogRes.arrayBuffer());
        const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.linkedinAccessToken}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202604",
          },
          body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${linkedinSub}` } }),
        });

        if (initRes.ok) {
          const initData = await initRes.json();
          const uploadUrl = initData.value.uploadUrl;
          const urn = initData.value.image;

          const putRes = await fetch(uploadUrl, { method: "PUT", body: imageBuffer });
          if (putRes.ok) {
            for (let i = 0; i < 6; i++) {
              await new Promise(r => setTimeout(r, 2000));
              const statusRes = await fetch(`https://api.linkedin.com/rest/images/${urn}`, {
                headers: {
                  Authorization: `Bearer ${token.linkedinAccessToken}`,
                  "LinkedIn-Version": "202604",
                },
              });
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.status === "AVAILABLE") {
                  imageUrn = urn;
                  break;
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Asset handshake failure:", err.message);
  }

  // --- Step 2: Payload Construction ---
  const finalTitle = (articleTitle || "Professional Health Ledger").split('_').join(' ');
  
  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: safeCommentary,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
    content: {
      article: {
        source: articleUrl,
        title: finalTitle,
        description: articleDescription || "Verified Professional Vouch",
        ...(imageUrn ? { thumbnail: imageUrn } : {}),
      }
    }
  };

  // Tagging logic with Entity Mapping
  if (voucherUrn && cleanVoucher && safeCommentary.includes(cleanVoucher)) {
    const startIndex = safeCommentary.indexOf(cleanVoucher);
    postPayload.commentary = {
      text: safeCommentary,
      attributes: [
        {
          start: startIndex,
          length: cleanVoucher.length,
          value: {
            "com.linkedin.common.MemberMention": {
              member: `urn:li:person:${voucherUrn}`
            }
          }
        }
      ]
    };
  }

  try {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.linkedinAccessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202604",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postPayload),
    });

    if (res.ok) return Response.json({ ok: true });

    const errBody = await res.text();
    return Response.json({ error: "LinkedIn Post Failed", details: errBody }, { status: 502 });
  } catch (err) {
    return Response.json({ error: "Backend error during post" }, { status: 500 });
  }
}
