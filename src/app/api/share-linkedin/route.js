import { getToken } from "next-auth/jwt";
import fs from "fs/promises";
import path from "path";

/**
 * POST /api/share-linkedin
 *
 * Publishes a post to the authenticated user's LinkedIn feed using the
 * Posts API. The LinkedIn access token is read from the encrypted JWT
 * cookie — it is never exposed to the browser.
 *
 * Body: { commentary: string, articleUrl: string, articleTitle?: string, articleDescription?: string }
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

  const { commentary, articleUrl, articleTitle, articleDescription, ogUrl } = body;

  if (!commentary || typeof commentary !== "string" || !commentary.trim()) {
    return Response.json(
      { error: "Post text (commentary) is required." },
      { status: 400 }
    );
  }

  // --- 2026 HANDSHAKE: Register and Upload Image Thumbnail ---
  let imageUrn = null;
  try {
    let imageBuffer = null;
    
    if (ogUrl && typeof ogUrl === "string") {
      try {
        const ogRes = await fetch(ogUrl);
        if (ogRes.ok) {
          imageBuffer = Buffer.from(await ogRes.arrayBuffer());
        }
      } catch (ogErr) {
        console.error("Failed to fetch dynamic OG image:", ogErr);
      }
    }

    if (!imageBuffer) {
      const bannerPath = path.join(process.cwd(), "public", "og_banner.png");
      imageBuffer = await fs.readFile(bannerPath);
    }

    // 1. Initialize Upload
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

      // 2. PUT Binary Data
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token.linkedinAccessToken}`,
        },
        body: imageBuffer,
      });

      if (putRes.ok) {
        imageUrn = urn;
      }
    }
  } catch (err) {
    console.error("LinkedIn Image Handshake failed, falling back to text card:", err);
  }

  // Build the LinkedIn Posts API payload
  const cleanTitle = (articleTitle || "Professional Health Ledger").replace(/_/g, " ");

  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: commentary.trim(),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
    },
    lifecycleState: "PUBLISHED",
  };

  // Attach article card if a URL was provided
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

  async function tryPost(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s per try

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
    // Attempt 1: Full post with article preview card
    let liRes = await tryPost(postPayload);

    // If it failed (or timed out/hung), attempt 2: Commentary-only (no preview card)
    if (!liRes.ok || liRes.status >= 400) {
      console.warn("Full post failed, retrying with commentary-only...", liRes.status);
      const simplePayload = {
        author: postPayload.author,
        commentary: postPayload.commentary,
        visibility: postPayload.visibility,
        distribution: postPayload.distribution,
        lifecycleState: postPayload.lifecycleState,
      };
      // Note: we still keep the URL in the commentary string if it was already there (it should be)
      liRes = await tryPost(simplePayload);
    }

    if (liRes.status === 201 || liRes.status === 200) {
      const postId = liRes.headers.get("x-restli-id") || "";
      return Response.json({ ok: true, postId });
    }

    // Still failed after retry
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
