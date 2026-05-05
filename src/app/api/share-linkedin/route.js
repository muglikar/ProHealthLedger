import { getToken } from "next-auth/jwt";
import { buildVouchOgUrl, OG_VOUCH_PREVIEW_VERSION } from "@/lib/og-vouch-url";
import {
  envLimit,
  getClientIp,
  rateLimitHeaders,
  takeRateLimit,
} from "@/lib/rate-limit";
import { createVouchOgImageResponse } from "@/lib/create-vouch-og-image-response";
import { displayFromParam } from "@/lib/og-vouch-card";
import { readRepoJson, writeRepoJson } from "@/lib/github";

/**
 * POST /api/share-linkedin
 *
 * Publishes a vouch to the authenticated user's LinkedIn feed.
 * Supports @mention tagging of the vouchee (opt-in via `tagVouchee` flag).
 *
 * Body: {
 *   commentary: string,
 *   articleUrl: string,
 *   articleTitle?: string,
 *   articleDescription?: string,
 *   cleanVoucher?: string,
 *   cleanVouchee?: string,
 *   voucheeSlug?: string,      // LinkedIn vanity slug for @mention
 *   tagVouchee?: boolean,      // true to attempt @mention tagging
 * }
 *
 * DELETE /api/share-linkedin
 *
 * Deletes a LinkedIn post by its URN (for repost-without-tag flow).
 *
 * Body: { postUrn: string }
 */

/**
 * Scrape the true display name from a member's public LinkedIn profile.
 */
async function resolveVoucheeName(vanitySlug) {
  if (!vanitySlug) return null;
  const slug = String(vanitySlug).trim().toLowerCase();
  if (!slug || slug.length < 2) return null;

  try {
    const profileUrl = `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<title>(.*?)\s*-.*LinkedIn<\/title>/i) || html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        return titleMatch[1].trim();
      }
    }
  } catch (e) {
    console.warn("Failed to scrape vouchee name:", e.message);
  }
  return null;
}

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

function vouchArticlePathname(articleUrl) {
  try {
    const u = new URL(articleUrl);
    const path = u.pathname.replace(/\/$/, "");
    if (/^\/p\/[^/]+\/[^/]+\/[^/]+$/.test(path)) return path;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Ordered list of server-safe OG PNG URLs (same-origin only). Prefer the
 * public hostname first — LinkedIn scrapes that URL; `VERCEL_URL` fetches can fail cold.
 */
function buildOgFetchCandidates(articleUrl, cleanVoucher, cleanVouchee) {
  const path = vouchArticlePathname(articleUrl);
  const out = [];
  const v = clampString(cleanVoucher || "A Colleague", MAX_NAME_PART);
  const uv = clampString(cleanVouchee || "Professional", MAX_NAME_PART);
  const siteBase = SITE_ORIGIN.replace(/\/+$/, "");
  const internalBase = INTERNAL_ORIGIN.replace(/\/+$/, "");
  const q = `v=${OG_VOUCH_PREVIEW_VERSION}`;

  /* Same URL order as `og:image` on the permalink (api first), then alternates. */
  out.push(buildVouchOgUrl(SITE_ORIGIN, v, uv));
  if (path) {
    out.push(`${siteBase}${path}/opengraph-image?${q}`);
  }
  if (internalBase !== siteBase) {
    out.push(buildVouchOgUrl(INTERNAL_ORIGIN, v, uv));
    if (path) {
      out.push(`${internalBase}${path}/opengraph-image?${q}`);
    }
  }
  return out;
}

function isPngBuffer(buf) {
  return (
    buf &&
    buf.length > 500 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
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
    commentary = "",
    articleUrl = "",
    cleanVoucher = "Rohit Kadam", // Fallback, but passed from client
    cleanVouchee = "Muglikar",
    voucheeSlug = "",
    articleTitle = "",
    articleDescription = "",
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

  // --- Generate OG image IN-PROCESS (no HTTP fetch needed) ---
  // Renders the same PNG as /api/og but without a network hop.
  const handshakeDiag = { ogGenerated: false, ogBytes: 0, initOk: false, putOk: false, pollResult: "skipped" };
  let imageUrn = null;
  try {
    let imageBuffer = null;

    // Generate the vouch card image directly — same function as /api/og
    const ogVoucher = displayFromParam(
      clampString((cleanVoucher || "").replace(/_/g, " "), MAX_NAME_PART),
      "A Colleague"
    );
    const ogVouchee = displayFromParam(
      clampString((cleanVouchee || "").replace(/_/g, " "), MAX_NAME_PART),
      "Professional"
    );
    try {
      const ogResponse = createVouchOgImageResponse(ogVoucher, ogVouchee);
      const ab = await ogResponse.arrayBuffer();
      const buf = Buffer.from(ab);
      if (isPngBuffer(buf)) {
        imageBuffer = buf;
        handshakeDiag.ogGenerated = true;
        handshakeDiag.ogBytes = buf.length;
        console.log("OG image generated in-process:", buf.length, "bytes");
      } else {
        console.error("In-process OG not a valid PNG:", buf.length);
      }
    } catch (ogErr) {
      console.error("In-process OG generation failed:", ogErr.message);
    }

    // Fallback: static banner for non-vouch links
    if (!imageBuffer && !vouchArticlePathname(safeArticleUrl)) {
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        const bannerPath = path.default.join(process.cwd(), "public", "og_banner.png");
        imageBuffer = await fs.default.readFile(bannerPath);
        handshakeDiag.ogGenerated = true;
        handshakeDiag.ogBytes = imageBuffer.length;
      } catch (fsErr) {
        console.error("Failed to read static banner:", fsErr.message);
      }
    }

    if (imageBuffer) {
      // Step A: Initialize Upload
      let initData;
      try {
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

        if (!initRes.ok) {
          const errText = await initRes.text().catch(() => "");
          console.error("Image init failed:", initRes.status, errText);
          handshakeDiag.initOk = false;
          handshakeDiag.initError = `${initRes.status}: ${errText.slice(0, 200)}`;
        } else {
          initData = await initRes.json();
          handshakeDiag.initOk = true;
        }
      } catch (initErr) {
        console.error("Image init exception:", initErr.message);
        handshakeDiag.initError = initErr.message;
      }

      if (initData?.value?.uploadUrl && initData?.value?.image) {
        const uploadUrl = initData.value.uploadUrl;
        const urn = initData.value.image;

        // Step B: PUT Binary Data
        const binaryBody = new Uint8Array(imageBuffer);
        let putOk = false;
        try {
          const putRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token.linkedinAccessToken}`,
              "Content-Type": "application/octet-stream",
              "Content-Length": String(binaryBody.byteLength),
            },
            body: binaryBody,
          });

          putOk = putRes.ok || putRes.status === 201;
          handshakeDiag.putOk = putOk;
          handshakeDiag.putStatus = putRes.status;
          if (!putOk) {
            const putErr = await putRes.text().catch(() => "");
            console.error("Image PUT failed:", putRes.status, putErr);
            handshakeDiag.putError = putErr.slice(0, 200);
          } else {
            console.log("Image PUT succeeded:", putRes.status, binaryBody.byteLength, "bytes");
          }
        } catch (putErr) {
          console.error("Image PUT exception:", putErr.message);
          handshakeDiag.putError = putErr.message;
        }

        if (putOk) {
          // Step C: Poll for AVAILABLE (4 attempts × 2s = 8s — keep within Vercel timeout)
          let isAvailable = false;
          for (let attempt = 1; attempt <= 4; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            try {
              const statusRes = await fetch(
                `https://api.linkedin.com/rest/images/${encodeURIComponent(urn)}`,
                {
                  headers: {
                    Authorization: `Bearer ${token.linkedinAccessToken}`,
                    "LinkedIn-Version": "202604",
                  },
                }
              );
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                console.log(`Image poll attempt ${attempt}: status=${statusData.status}`);
                if (statusData.status === "AVAILABLE") {
                  isAvailable = true;
                  imageUrn = urn;
                  handshakeDiag.pollResult = "AVAILABLE";
                  break;
                }
                handshakeDiag.pollResult = statusData.status || "unknown";
              }
            } catch (pollErr) {
              console.error(`Image poll attempt ${attempt} error:`, pollErr.message);
              handshakeDiag.pollResult = `error: ${pollErr.message}`;
            }
          }

          // If not confirmed AVAILABLE, use URN optimistically — LinkedIn often processes fast
          if (!isAvailable) {
            console.warn("Image not confirmed AVAILABLE after 4 polls — using URN optimistically");
            imageUrn = urn;
            handshakeDiag.pollResult = handshakeDiag.pollResult + " (optimistic)";
          }
        }
      }
    }
  } catch (err) {
    console.error("Image Handshake failed, falling back to text card:", err.message);
    handshakeDiag.error = err.message;
  }

  const safeVoucher = clampString(
    (cleanVoucher || "").split("_").join(" "),
    MAX_NAME_PART
  );
  let safeVouchee = clampString(
    (cleanVouchee || "").split("_").join(" "),
    MAX_NAME_PART
  );

  // --- Real-time Name Resolution Fallback ---
  // If the vouchee's name is just the unbroken slug, try to scrape it
  let scrapedName = null;
  if (voucheeSlug && safeVouchee.toLowerCase() === voucheeSlug.replace(/-/g, '').toLowerCase()) {
    scrapedName = await resolveVoucheeName(voucheeSlug);
  }

  // If we successfully scraped the true name, update the local variables
  // so that the effectiveCommentary and cleanTitle use the correct spacing.
  let effectiveCommentary = finalCommentary;
  if (scrapedName && scrapedName.toLowerCase() !== safeVouchee.toLowerCase()) {
    // Replace all occurrences of the unbroken string with the properly spaced string
    const escapedVouchee = safeVouchee.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    effectiveCommentary = effectiveCommentary.replace(new RegExp(escapedVouchee, 'g'), scrapedName);
    safeVouchee = scrapedName; // Use scraped name for OG image title
  }

  const fallbackTitle = clampString(
    (articleTitle || "Professional Health Ledger").split("_").join(" "),
    MAX_TITLE
  );
  // Re-generate the articleTitle with the corrected safeVouchee name if applicable
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
    commentary: effectiveCommentary,
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
      return Response.json({
        ok: true,
        postId,
        thumbnailIncluded: Boolean(imageUrn),
        handshake: handshakeDiag,
      });
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
      );
    }
    return Response.json(
      { error: "Failed to reach LinkedIn. Please try again." },
      { status: 502 }
    );
  }
}

/**
 * DELETE /api/share-linkedin
 *
 * Deletes a previously created LinkedIn post so the user can repost
 * without @mention tagging (repost-without-tag flow).
 */
export async function DELETE(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.linkedinAccessToken || token.provider !== "linkedin") {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const { postUrn } = body;
  if (!postUrn || !String(postUrn).startsWith("urn:li:share:")) {
    return Response.json({ error: "Invalid postUrn." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.linkedin.com/rest/posts/${encodeURIComponent(postUrn)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token.linkedinAccessToken}`,
          "LinkedIn-Version": "202604",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    if (res.status === 204 || res.ok) {
      return Response.json({ ok: true, deleted: postUrn });
    }

    const errBody = await res.text().catch(() => "");
    console.error("LinkedIn delete failed:", res.status, errBody);
    return Response.json(
      { error: "Could not delete the post.", status: res.status },
      { status: 502 }
    );
  } catch (err) {
    return Response.json(
      { error: "Failed to reach LinkedIn for deletion." },
      { status: 502 }
    );
  }
}
