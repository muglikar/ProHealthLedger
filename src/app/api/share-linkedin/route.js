import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 * 
 * RESTORED TO STABLE NODE.JS RUNTIME.
 * - Simple string-based commentary.
 * - Native bracketed @mentions.
 * - Proven 202604 versioning.
 */
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json({ error: "Unauthorized - Please re-login." }, { status: 401 });
  }

  const linkedinSub = token.linkedinSub || token.userId?.replace("linkedin:", "");
  if (!linkedinSub) return Response.json({ error: "Identity not found." }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
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

  // --- Step 1: Image Asset Handshake (Node-safe) ---
  let imageUrn = null;
  try {
    if (ogUrl) {
      const ogRes = await fetch(ogUrl, { shadow: true, signal: AbortSignal.timeout(10000) });
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
            // Polling
            for (let i = 0; i < 5; i++) {
              await new Promise(r => setTimeout(r, 1500));
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
    console.error("Asset error:", err.message);
  }

  // --- Step 2: Payload Construction (Stable String Approach) ---
  const mentionText = (voucherUrn && cleanVoucher)
    ? `Big thanks to @[${cleanVoucher}](urn:li:person:${voucherUrn}) for the vouch!\n\n`
    : "";

  const finalTitle = (articleTitle || "Professional Health Ledger").split('_').join(' ');

  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: (mentionText + commentary).trim(),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
    content: {
      article: {
        source: articleUrl.trim(),
        title: finalTitle,
        description: articleDescription || "Verified Professional Vouch",
        ...(imageUrn ? { thumbnail: imageUrn } : {}),
      },
    },
  };

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

    if (res.status === 201 || res.status === 200) {
      return Response.json({ ok: true });
    }

    const errText = await res.text();
    return Response.json({ error: "LinkedIn rejected the post.", details: errText }, { status: 502 });
  } catch (err) {
    return Response.json({ error: "Backend failure", details: err.message }, { status: 500 });
  }
}
