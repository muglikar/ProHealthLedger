import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";

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

  const { commentary, articleUrl, articleTitle, articleDescription } = body;

  if (!commentary || typeof commentary !== "string" || !commentary.trim()) {
    return Response.json(
      { error: "Post text (commentary) is required." },
      { status: 400 }
    );
  }

  // Build the LinkedIn Posts API payload
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
        title: articleTitle || "Professional Health Ledger",
        description:
          articleDescription ||
          "See verified professional vouches on Pro-Health Ledger",
      },
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const liRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.linkedinAccessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202504",
      },
      body: JSON.stringify(postPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (liRes.status === 201 || liRes.status === 200) {
      const postId = liRes.headers.get("x-restli-id") || "";
      return Response.json({ ok: true, postId });
    }

    let errBody;
    try {
      errBody = await liRes.json();
    } catch {
      errBody = await liRes.text();
    }
    console.error("LinkedIn Posts API error:", liRes.status, errBody);
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
        { error: "LinkedIn API timed out. Please try again or use manual share." },
        { status: 504 }
      );
    }
    console.error("LinkedIn Posts API fetch error:", err);
    return Response.json(
      { error: "Failed to reach LinkedIn. Please try again." },
      { status: 502 }
    );
  }
}
