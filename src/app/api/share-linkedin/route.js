import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 *
 * RESTORED TO STABLE WORKING STATE.
 * Publishes a vouch with:
 *  - 3-step asset upload (initialize -> PUT -> Poll)
 *  - String-based commentary (no complex attributes)
 *  - Clean article titles
 */
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json({ error: "You must be signed in with LinkedIn." }, { status: 401 });
  }

  const linkedinSub = token.linkedinSub || token.userId?.replace("linkedin:", "");
  if (!linkedinSub) return Response.json({ error: "Identity failure." }, { status: 400 });

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

  // --- Step 1: Image Asset Handshake (Proven Loop) ---
  let imageUrn = null;
  try {
    let imageBuffer = null;
    if (ogUrl) {
      const ogRes = await fetch(ogUrl, { signal: AbortSignal.timeout(8000) });
      if (ogRes.ok) imageBuffer = Buffer.from(await ogRes.arrayBuffer());
    }

    if (imageBuffer) {
      const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.linkedinAccessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202401",
        },
        body: JSON.stringify({ initializeUploadRequest: { owner: `urn:li:person:${linkedinSub}` } }),
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        const uploadUrl = initData.value.uploadUrl;
        const urn = initData.value.image;

        const putRes = await fetch(uploadUrl, { method: "PUT", body: imageBuffer });
        
        if (putRes.ok) {
          // Poll for AVAILABLE status
          let isAvailable = false;
          for (let i = 0; i < 6; i++) {
            await new Promise(r => setTimeout(r, 1500));
            const statusRes = await fetch(`https://api.linkedin.com/rest/images/${urn}`, {
              headers: {
                Authorization: `Bearer ${token.linkedinAccessToken}`,
                "LinkedIn-Version": "202401",
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
    console.error("Asset handshake failed:", err.message);
  }

  // --- Step 2: Payload Construction (Stable String Format) ---
  const mentionPrefix = (voucherUrn && cleanVoucher)
    ? `Big thanks to @[${cleanVoucher}](urn:li:person:${voucherUrn}) for the vouch!\n\n`
    : "";

  const finalTitle = (articleTitle || "Professional Health Ledger").split('_').join(' ');

  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: (mentionPrefix + (commentary || "")).trim(),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED" },
    lifecycleState: "PUBLISHED",
  };

  if (articleUrl) {
    postPayload.content = {
      article: {
        source: articleUrl.trim(),
        title: finalTitle,
        description: articleDescription || "See verified professional vouches on Pro-Health Ledger",
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

    const errDetail = await res.text();
    return Response.json({ error: "LinkedIn rejected the post.", details: errDetail }, { status: 502 });
  } catch (err) {
    return Response.json({ error: "Failed to reach LinkedIn." }, { status: 502 });
  }
}
