import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 *
 * Publishes a vouch with:
 *  - Functional @mention tagging via character index mapping (Attributes API)
 *  - 3-step asset upload from our italic-enabled OG route
 *  - Bulletproof article titles
 */
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json({ error: "You must be signed in with LinkedIn to post." }, { status: 401 });
  }

  const linkedinSub = token.linkedinSub || token.userId?.replace("linkedin:", "");
  if (!linkedinSub) return Response.json({ error: "Could not determine identity." }, { status: 400 });

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
    cleanVouchee,
  } = body;

  // --- Construct Commentary with Robust Mention Mapping ---
  let finalCommentary = commentary.trim();
  
  // Prepare "Big thanks to [Name] for the vouch!"
  // We use actual character indices to ensure LinkedIn renders the tag correctly.
  const mentionText = `Big thanks to ${cleanVoucher} for the vouch!\n\n`;
  const fullText = mentionText + finalCommentary;

  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: fullText,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
  };

  // If we have a URN, we add the mention attribute to the commentary
  // Note: For versioned Posts API, mentions are often handled via this structured format:
  if (voucherUrn && cleanVoucher) {
    // Offset is 14 because "Big thanks to " is 14 chars. 
    // Length is precisely cleanVoucher.length
    postPayload.commentary = {
      text: fullText,
      attributes: [
        {
          start: 14,
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

  // --- 3-Step Asset Upload (Handshake) ---
  let imageUrn = null;
  try {
    let imageBuffer = null;
    if (ogUrl) {
      try {
        const ogRes = await fetch(ogUrl, { signal: AbortSignal.timeout(10000) });
        if (ogRes.ok) imageBuffer = Buffer.from(await ogRes.arrayBuffer());
      } catch (ogErr) { console.error("OG Fetch Fail:", ogErr.message); }
    }

    if (imageBuffer) {
      const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.linkedinAccessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202401", // Use stable version
        },
        body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${linkedinSub}` } }),
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        const uploadUrl = initData.value.uploadUrl;
        const urn = initData.value.image;

        const putRes = await fetch(uploadUrl, { method: "PUT", body: imageBuffer });
        if (putRes.ok) {
          // Quick poll
          await new Promise(r => setTimeout(r, 2000));
          imageUrn = urn;
        }
      }
    }
  } catch (err) { console.error("Asset upload failed:", err.message); }

  // Rest of Post Logic
  const cleanTitle = (articleTitle || "Professional Health Ledger").split('_').join(' ');

  if (articleUrl) {
    postPayload.content = {
      article: {
        source: articleUrl.trim(),
        title: cleanTitle,
        description: articleDescription || "Verified Professional Vouch",
        ...(imageUrn ? { thumbnail: imageUrn } : {}),
      },
    };
  }

  try {
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.linkedinAccessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postPayload),
    });

    if (res.status === 201 || res.status === 200) {
      return Response.json({ ok: true, postId: res.headers.get("x-restli-id") });
    }
    
    const errBody = await res.text();
    console.error("LinkedIn API Fail:", res.status, errBody);
    return Response.json({ error: "LinkedIn rejected the post.", details: errBody }, { status: 502 });
  } catch (err) {
    console.error("LinkedIn Post Error:", err);
    return Response.json({ error: "Failed to post to LinkedIn." }, { status: 502 });
  }
}
