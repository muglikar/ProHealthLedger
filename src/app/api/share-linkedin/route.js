import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 *
 * Publishes a vouch with full 3-step image handshake and @mention tagging.
 * Uses a robust polling loop to ensure the image is AVAILABLE before posting.
 */
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json({ error: "You must be signed in with LinkedIn." }, { status: 401 });
  }

  const linkedinSub = token.linkedinSub || token.userId?.replace("linkedin:", "");
  
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
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

  // --- Step 1: Image Asset Handshake ---
  let imageUrn = null;
  try {
    let imageBuffer = null;
    if (ogUrl) {
      const ogRes = await fetch(ogUrl, { signal: AbortSignal.timeout(10000) });
      if (ogRes.ok) imageBuffer = Buffer.from(await ogRes.arrayBuffer());
    }

    if (imageBuffer) {
      // A. Initialize
      const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.linkedinAccessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202305",
        },
        body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${linkedinSub}` } }),
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        const uploadUrl = initData.value.uploadUrl;
        const urn = initData.value.image;

        // B. PUT binary
        const putRes = await fetch(uploadUrl, { method: "PUT", body: imageBuffer });
        
        if (putRes.ok) {
          // C. POLL for AVAILABLE (Critical for Hero Card success)
          let isAvailable = false;
          let attempts = 0;
          while (!isAvailable && attempts < 5) {
            attempts++;
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s
            const statusRes = await fetch(`https://api.linkedin.com/rest/images/${urn}`, {
              headers: {
                Authorization: `Bearer ${token.linkedinAccessToken}`,
                "LinkedIn-Version": "202305",
              },
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === "AVAILABLE") {
                isAvailable = true;
                imageUrn = urn;
                break;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Image Handshake Error:", err.message);
  }

  // --- Step 2: Final Post Payload ---
  const mentionText = voucherUrn && cleanVoucher 
    ? `Big thanks to @[${cleanVoucher}](urn:li:person:${voucherUrn}) for the vouch!\n\n`
    : "";
  
  const fullCommentary = mentionText + commentary;
  const cleanTitle = (articleTitle || "Professional Health Ledger").split('_').join(' ');

  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: fullCommentary,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
    content: {
      article: {
        source: articleUrl,
        title: cleanTitle,
        description: articleDescription || "Professional Health Ledger Vouch",
        ...(imageUrn ? { thumbnail: imageUrn } : {}),
      }
    }
  };

  try {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.linkedinAccessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202305",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postPayload),
    });

    if (res.status === 201 || res.status === 200) {
      return Response.json({ ok: true, postId: res.headers.get("x-restli-id") });
    }

    const errData = await res.json().catch(() => ({ message: "Unknown LinkedIn error" }));
    return Response.json({ 
      error: "LinkedIn rejected the post.", 
      details: errData.message || JSON.stringify(errData) 
    }, { status: 502 });
    
  } catch (err) {
    return Response.json({ error: "Failed to connect to LinkedIn." }, { status: 502 });
  }
}
