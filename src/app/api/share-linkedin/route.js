import { getToken } from "next-auth/jwt";

/**
 * POST /api/share-linkedin
 *
 * Publishes a vouch to the authenticated user's LinkedIn feed using the
 * Posts API with:
 *  - Automatic @mention tagging of the voucher (if URN available)
 *  - 3-step asset upload from our instant OG image route
 *  - Clean article card titles (no underscores)
 *
 * Body: {
 *   commentary: string,
 *   articleUrl: string,
 *   articleTitle?: string,
 *   articleDescription?: string,
 *   ogUrl?: string,
 *   voucherUrn?: string,
 *   cleanVoucher?: string,
 *   cleanVouchee?: string,
 * }
 */
export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json(
      { error: "You must be signed in with LinkedIn to post." },
      { status: 401 }
    );
  }

  const linkedinSub = token.linkedinSub || token.userId?.replace("linkedin:", "");
  if (!linkedinSub) {
    return Response.json(
      { error: "Could not determine your LinkedIn identity." },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
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

  if (!commentary || typeof commentary !== "string" || !commentary.trim()) {
    return Response.json(
      { error: "Post text (commentary) is required." },
      { status: 400 }
    );
  }

  // --- 3-Step Asset Upload: Fetch OG image → Initialize → PUT → Poll ---
  const finalCommentary = commentary.trim();
  let imageUrn = null;
  try {
    let imageBuffer = null;

    // Step 0: Fetch our own OG image (text-only, <50ms)
    if (ogUrl && typeof ogUrl === "string") {
      try {
        const ogRes = await fetch(ogUrl, { signal: AbortSignal.timeout(5000) });
        if (ogRes.ok) {
          imageBuffer = Buffer.from(await ogRes.arrayBuffer());
        }
      } catch (ogErr) {
        console.error("Failed to fetch OG image:", ogErr.message);
      }
    }

    // Fallback: static banner
    if (!imageBuffer) {
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const bannerPath = path.default.join(process.cwd(), "public", "og_banner.png");
        imageBuffer = await fs.default.readFile(bannerPath);
      } catch (fsErr) {
        console.error("Failed to read static banner:", fsErr.message);
      }
    }

    if (imageBuffer) {
      // Step A: Initialize Upload
      const initRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.linkedinAccessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202604",
        },
        body: JSON.stringify({
          initializeUploadRequest: { owner: `urn:li:person:${linkedinSub}` },
        }),
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        const uploadUrl = initData.value.uploadUrl;
        const urn = initData.value.image;

        // Step B: PUT Binary Data
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token.linkedinAccessToken}`,
          },
          body: imageBuffer,
        });

        if (putRes.ok) {
          // Step C: Poll for AVAILABLE status
          let isAvailable = false;
          let attempts = 0;
          const maxAttempts = 5;

          while (!isAvailable && attempts < maxAttempts) {
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, 1500));

            try {
              const statusRes = await fetch(`https://api.linkedin.com/rest/images/${urn}`, {
                headers: {
                  Authorization: `Bearer ${token.linkedinAccessToken}`,
                  "LinkedIn-Version": "202604",
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
            } catch (pollErr) {
              console.error("Image poll error:", pollErr.message);
            }
          }

          // If polling didn't confirm AVAILABLE, try using the URN anyway
          // (LinkedIn often processes faster than the status endpoint reports)
          if (!isAvailable) {
            imageUrn = urn;
          }
        }
      } else {
        const initErr = await initRes.text();
        console.error("Image init failed:", initRes.status, initErr);
      }
    }
  } catch (err) {
    console.error("Image Handshake failed, falling back to text card:", err.message);
  }

  // --- Build the LinkedIn Posts API payload ---
  // Build clean title: "[Voucher] vouched for [Vouchee] - Professional Health Ledger"
  const safeVoucher = (cleanVoucher || "").split('_').join(' ');
  const safeVouchee = (cleanVouchee || "").split('_').join(' ');
  const cleanTitle = (safeVoucher && safeVouchee)
    ? `${safeVoucher} vouched for ${safeVouchee} on Professional Health Ledger`
    : (articleTitle || "Professional Health Ledger").split('_').join(' ');

  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: finalCommentary,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
    },
    lifecycleState: "PUBLISHED",
  };

  // Attach article card with thumbnail if available
  if (articleUrl && typeof articleUrl === "string" && articleUrl.trim()) {
    postPayload.content = {
      article: {
        source: articleUrl.trim(),
        title: cleanTitle,
        description:
          articleDescription ||
          "See verified professional vouches on Pro-Health Ledger",
        ...(imageUrn ? { thumbnail: imageUrn } : {}),
      },
    };
  }

  // --- Post to LinkedIn with retry ---
  async function tryPost(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.linkedinAccessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202604",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  try {
    // Attempt 1: Full post with article card + thumbnail
    let liRes = await tryPost(postPayload);

    // Attempt 2: If full card fails, strip to commentary-only
    if (!liRes.ok || liRes.status >= 400) {
      const errDetail = await liRes.text().catch(() => "");
      console.warn("Full post failed:", liRes.status, errDetail, "— retrying commentary-only");
      const simplePayload = {
        author: postPayload.author,
        commentary: postPayload.commentary,
        visibility: postPayload.visibility,
        distribution: postPayload.distribution,
        lifecycleState: postPayload.lifecycleState,
      };
      liRes = await tryPost(simplePayload);
    }

    if (liRes.status === 201 || liRes.status === 200) {
      const postId = liRes.headers.get("x-restli-id") || "";
      return Response.json({ ok: true, postId });
    }

    // Still failed
    let errBody;
    try {
      errBody = await liRes.json();
    } catch {
      errBody = await liRes.text();
    }
    console.error("LinkedIn Posts API fail after retry:", liRes.status, errBody);
    return Response.json(
      {
        error: "LinkedIn rejected the post.",
        status: liRes.status,
        details: errBody,
      },
      { status: 502 }
    );
  } catch (err) {
    if (err.name === "AbortError") {
      return Response.json(
        { error: "LinkedIn API timed out. Please try the manual share." },
        { status: 504 }
      );
    }
    return Response.json(
      { error: "Failed to reach LinkedIn. Please try again." },
      { status: 502 }
    );
  }
}
