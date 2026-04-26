import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 * 
 * 2026 Edition - High Impact Sharing
 * - Explicit Entity Mapping for blue clickable mentions
 * - Media-First Article structure to force Hero Card rendering
 * - Stable 202604 Versioning
 */
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const linkedinSub = token.linkedinSub || token.userId?.replace("linkedin:", "");
  
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const {
    commentary,
    articleUrl,
    articleTitle,
    articleDescription,
    ogUrl,
    voucherUrn,
    cleanVoucher,
  } = body;

  // --- Step 1: Force Image Asset Availability ---
  let imageUrn = null;
  try {
    let imageBuffer = null;
    if (ogUrl) {
      const ogRes = await fetch(ogUrl, { signal: AbortSignal.timeout(10000) });
      if (ogRes.ok) imageBuffer = Buffer.from(await ogRes.arrayBuffer());
    }

    if (imageBuffer) {
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
          // Poll until DEFINITIVELY available
          let attempts = 0;
          while (attempts < 6) {
            attempts++;
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
  } catch (err) {
    console.error("Image processing error:", err.message);
  }

  // --- Step 2: Complex Commentary with Entity Mapping (Mentions) ---
  // We use the cleaned text from the modal and manually map the mention attribute.
  const finalCommentary = commentary || "";
  const cleanTitle = (articleTitle || "Professional Health Ledger").split('_').join(' ');

  // The Mention Attributes array is the Gold Standard for blue tags in 2026.
  let commentaryObject = { text: finalCommentary };
  
  if (voucherUrn && cleanVoucher && finalCommentary.includes(cleanVoucher)) {
    const startIndex = finalCommentary.indexOf(cleanVoucher);
    commentaryObject.attributes = [
      {
        start: startIndex,
        length: cleanVoucher.length,
        value: {
          "com.linkedin.common.MemberMention": {
            member: `urn:li:person:${voucherUrn}`
          }
        }
      }
    ];
  }

  // --- Step 3: Latest 2026 Schema Payload ---
  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: finalCommentary, // Fallback for simple parsers
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
    content: {
      article: {
        source: articleUrl,
        title: cleanTitle,
        description: articleDescription || "Verified Professional Vouch",
        ...(imageUrn ? { thumbnail: imageUrn } : {}),
      }
    }
  };

  // If we have attributes, we provide the commentary as an object
  if (commentaryObject.attributes) {
    postPayload.commentary = commentaryObject;
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

    if (res.ok) {
      return Response.json({ ok: true });
    }

    const errText = await res.text();
    return Response.json({ error: "LinkedIn Post Failed", details: errText }, { status: 502 });
  } catch (err) {
    return Response.json({ error: "Connection error" }, { status: 502 });
  }
}
