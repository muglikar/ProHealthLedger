import { getToken } from "next-auth/jwt";
import { buildVouchOgUrl, OG_VOUCH_PREVIEW_VERSION } from "@/lib/og-vouch-url";
import {
  envLimit,
  getClientIp,
  rateLimitHeaders,
  takeRateLimit,
} from "@/lib/rate-limit";

/**
 * POST /api/share-linkedin
 *
 * Publishes a vouch to the authenticated user's LinkedIn feed using the
 * Posts API with:
 *  - 3-step asset upload from `…/opengraph-image` on the article path (server-built URL)
 *  - Clean article card titles (no underscores)
 *
 * Body: {
 *   commentary: string,
 *   articleUrl: string,        // must be on the configured site origin
 *   articleTitle?: string,
 *   articleDescription?: string,
 *   cleanVoucher?: string,     // used to build the server-side OG URL
 *   cleanVouchee?: string,     // used to build the server-side OG URL
 * }
 *
 * SSRF hardening: never fetch a client-supplied image URL. Thumbnail fetch uses
 * `articleUrl` pathname → `/p/…/opengraph-image` (after same-origin check).
 */

/** Canonical site origin (no trailing slash). Used for SSRF + article-URL allowlists. */
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://prohealthledger.org"
).replace(/\/+$/, "");

/** Hard caps to keep this route boring under load and abuse. */
const MAX_COMMENTARY = 3000;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 400;
const MAX_NAME_PART = 120;

function clampString(value, max) {
  if (typeof value !== "string") return "";
  const t = value.trim();
  return t.length > max ? t.slice(0, max) : t;
}

/** Strict same-origin allowlist for `articleUrl` (the link card LinkedIn renders). */
function isAllowedSiteUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return url.origin === SITE_ORIGIN;
}

/**
 * Internal origin for server→server fetches (bypasses Cloudflare).
 * VERCEL_URL is set automatically on every Vercel deployment.
 */
const INTERNAL_ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : SITE_ORIGIN;

/**
 * Same pixels as `og:image` on the permalink: .../opengraph-image (SSRF-safe:
 * path comes only from validated same-origin `articleUrl`).
 */
function buildOgFetchUrl(articleUrl, cleanVoucher, cleanVouchee) {
  try {
    const u = new URL(articleUrl);
    const path = u.pathname.replace(/\/$/, "");
    if (/^\/p\/[^/]+\/[^/]+\/[^/]+$/.test(path)) {
      const base = INTERNAL_ORIGIN.replace(/\/+$/, "");
      return `${base}${path}/opengraph-image?v=${OG_VOUCH_PREVIEW_VERSION}`;
    }
  } catch {
    /* fall through */
  }
  const v = clampString(cleanVoucher || "A_Colleague", MAX_NAME_PART);
  const uv = clampString(cleanVouchee || "Professional", MAX_NAME_PART);
  return buildVouchOgUrl(INTERNAL_ORIGIN, v, uv);
}

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json(
      { error: "You must be signed in with LinkedIn to post." },
      { status: 401 }
    );
  }

  const shareLimit = envLimit("RL_SHARE_LINKEDIN_LIMIT", 5);
  const shareWindowMs = envLimit("RL_SHARE_LINKEDIN_WINDOW_MS", 60 * 60 * 1000);
  const shareRl = takeRateLimit({
    key: `share-linkedin:${token.userId || "unknown"}:${getClientIp(req)}`,
    limit: shareLimit,
    windowMs: shareWindowMs,
  });
  if (!shareRl.allowed) {
    return Response.json(
      { error: "Too many LinkedIn post attempts. Please try again later." },
      { status: 429, headers: rateLimitHeaders(shareRl) }
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
    cleanVoucher,
    cleanVouchee,
  } = body;

  const finalCommentary = clampString(commentary, MAX_COMMENTARY);
  if (!finalCommentary) {
    return Response.json(
      { error: "Post text (commentary) is required." },
      { status: 400 }
    );
  }

  /**
   * SSRF guard: `articleUrl` is required and must be on the configured site
   * origin. We never fetch it server-side, but it does end up as the link card
   * LinkedIn shows under the user's name; allowing arbitrary URLs would let any
   * signed-in user post arbitrary external links to their feed under PHL
   * branding via this route.
   */
  if (!isAllowedSiteUrl(articleUrl)) {
    return Response.json(
      {
        error:
          "articleUrl must be a https URL on the configured site origin.",
      },
      { status: 400 }
    );
  }
  const safeArticleUrl = articleUrl.trim();

  // --- 3-Step Asset Upload: Fetch OG image → Initialize → PUT → Poll ---
  // The OG URL is built on the server (no client-provided URL is ever fetched
  // server-side — that would be SSRF).
  const ogUrl = buildOgFetchUrl(safeArticleUrl, cleanVoucher, cleanVouchee);
  let imageUrn = null;
  try {
    let imageBuffer = null;

    // Step 0: Fetch our own OG image via internal Vercel URL (bypasses Cloudflare).
    try {
      const ogRes = await fetch(ogUrl, { signal: AbortSignal.timeout(8000) });
      if (ogRes.ok) {
        imageBuffer = Buffer.from(await ogRes.arrayBuffer());
        console.log("OG image fetched OK:", imageBuffer.length, "bytes from", ogUrl);
      } else {
        console.error("OG image fetch non-OK:", ogRes.status, ogRes.statusText, ogUrl);
      }
    } catch (ogErr) {
      console.error("OG image fetch exception:", ogErr.message, ogUrl);
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
  const safeVoucher = clampString(
    (cleanVoucher || "").split("_").join(" "),
    MAX_NAME_PART
  );
  const safeVouchee = clampString(
    (cleanVouchee || "").split("_").join(" "),
    MAX_NAME_PART
  );
  const fallbackTitle = clampString(
    (articleTitle || "Professional Health Ledger").split("_").join(" "),
    MAX_TITLE
  );
  const cleanTitle =
    safeVoucher && safeVouchee
      ? clampString(
          `${safeVoucher} vouched for ${safeVouchee} on Professional Health Ledger`,
          MAX_TITLE
        )
      : fallbackTitle;
  const safeDescription = clampString(
    articleDescription || "See verified professional vouches on Pro-Health Ledger",
    MAX_DESCRIPTION
  );

  const postPayload = {
    author: `urn:li:person:${linkedinSub}`,
    commentary: finalCommentary,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
    },
    lifecycleState: "PUBLISHED",
    content: {
      article: {
        source: safeArticleUrl,
        title: cleanTitle,
        description: safeDescription,
        ...(imageUrn ? { thumbnail: imageUrn } : {}),
      },
    },
  };

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

    // Attempt 2: Keep article card but remove thumbnail if image URN handshake
    // was the failing part.
    if (!liRes.ok || liRes.status >= 400) {
      const errDetail = await liRes.text().catch(() => "");
      console.warn(
        "Full post failed:",
        liRes.status,
        errDetail,
        "— retrying article card without thumbnail"
      );
      const articleNoThumbPayload = {
        author: postPayload.author,
        commentary: postPayload.commentary,
        visibility: postPayload.visibility,
        distribution: postPayload.distribution,
        lifecycleState: postPayload.lifecycleState,
        content: {
          article: {
            source: safeArticleUrl,
            title: cleanTitle,
            description: safeDescription,
          },
        },
      };
      liRes = await tryPost(articleNoThumbPayload);
    }

    // Attempt 3: if card payload still fails, strip to commentary-only.
    if (!liRes.ok || liRes.status >= 400) {
      const errDetail = await liRes.text().catch(() => "");
      console.warn(
        "Article payload failed:",
        liRes.status,
        errDetail,
        "— retrying commentary-only"
      );
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
