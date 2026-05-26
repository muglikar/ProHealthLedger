/**
 * Resolve the real display name AND profile photo for a LinkedIn `/in/<slug>`
 * profile by fetching the public page and extracting the `<title>` and
 * `og:image` tags. LinkedIn public profiles typically render titles like:
 *
 *   "Deepak Dhole - Senior Engineer - Company X | LinkedIn"
 *   "Jane Doe | LinkedIn"
 *
 * And include an og:image meta tag pointing to the profile photo.
 *
 * This is best-effort and non-blocking. It uses a multi-pronged approach:
 * 1. Direct fetch of the LinkedIn public profile.
 * 2. Fallback to searching Google (site:linkedin.com/in/<slug>) to extract
 *    the name from search results, bypassing LinkedIn's authwall.
 *
 * If all strategies fail (e.g., due to rate-limiting or captchas on Vercel IPs),
 * we gracefully return null values and let the caller fall back to defaults.
 */

const FETCH_TIMEOUT_MS = 5000;

/**
 * @param {string} slug - LinkedIn `/in/<slug>` handle (lowercase).
 * @returns {Promise<{name: string|null, photo: string|null}>}
 */
export async function resolveLinkedinProfile(slug) {
  if (!slug || typeof slug !== "string") return { name: null, photo: null };

  const url = `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });

    if (!res.ok) return { name: await fallbackNameFromGoogleSerp(slug), photo: null };

    // Read enough HTML to get meta tags (they're in <head>, so first ~64KB is plenty).
    const reader = res.body?.getReader();
    if (!reader) return { name: null, photo: null };

    let html = "";
    const decoder = new TextDecoder();
    const MAX_BYTES = 65536;

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      // Stop early once we've found the end of </head> — all meta tags are there.
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});

    const name = extractNameFromHtml(html);
    const photo = extractPhotoFromHtml(html);

    // If we got at least a photo, return what we have.
    if (name || photo) {
      return {
        name: name || null,
        photo: photo || null,
      };
    }

    // If direct extraction failed entirely, try the SERP fallback for the name.
    return { name: await fallbackNameFromGoogleSerp(slug), photo: null };
  } catch {
    // If direct fetch threw an error, attempt the SERP fallback for the name.
    return { name: await fallbackNameFromGoogleSerp(slug), photo: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Backward-compatible wrapper: resolve only the name.
 * @param {string} slug
 * @returns {Promise<string|null>}
 */
export async function resolveLinkedinName(slug) {
  const { name } = await resolveLinkedinProfile(slug);
  return name;
}

/**
 * Fallback Strategy: Scrape Google search results for the name.
 */
async function fallbackNameFromGoogleSerp(slug) {
  const query = `site:linkedin.com/in/${encodeURIComponent(slug)}`;
  const url = `https://www.google.com/search?q=${query}&hl=en`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    const h3Regex = /<h3[^>]*>([^<]+LinkedIn[^<]*)<\/h3>/gi;
    let match;

    while ((match = h3Regex.exec(html)) !== null) {
      const name = extractNameFromTitle(match[1]);
      if (name) return name;
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract og:image (profile photo) from LinkedIn page HTML.
 *
 * Filters out LinkedIn's generic placeholder images so we only store
 * actual profile photos.
 */
function extractPhotoFromHtml(html) {
  if (!html) return null;

  // Try both attribute orders for og:image
  const ogMatch =
    html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:image"/i);

  if (!ogMatch) return null;

  let url = ogMatch[1].trim();

  // Decode HTML entities (LinkedIn encodes & as &amp; in meta tags)
  url = url
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  // Filter out LinkedIn's generic placeholder/ghost images
  if (!url.includes("media.licdn.com")) return null;
  if (url.includes("ghost") || url.includes("default")) return null;

  return url;
}

/**
 * Extract a person's name from LinkedIn page HTML.
 */
function extractNameFromHtml(html) {
  if (!html) return null;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const name = extractNameFromTitle(titleMatch[1]);
    if (name) return name;
  }

  const ogMatch = html.match(
    /<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i
  );
  if (!ogMatch) {
    const ogMatch2 = html.match(
      /<meta\s+content="([^"]+)"\s+(?:property|name)="og:title"/i
    );
    if (ogMatch2) {
      const name = extractNameFromTitle(ogMatch2[1]);
      if (name) return name;
    }
  } else {
    const name = extractNameFromTitle(ogMatch[1]);
    if (name) return name;
  }

  return null;
}

/**
 * Parse the name from a title string.
 */
function extractNameFromTitle(raw) {
  if (!raw || typeof raw !== "string") return null;

  let s = raw.trim();
  s = s.replace(/^\(\d+\)\s*/, "");
  s = s.replace(/\s*\|\s*LinkedIn\s*$/i, "");

  const firstSegment = s.split(/\s+-\s+/)[0].trim();

  if (!firstSegment) return null;
  if (firstSegment.length < 2) return null;
  if (/linkedin\.com/i.test(firstSegment)) return null;
  if (/^linkedin$/i.test(firstSegment)) return null;

  const decoded = firstSegment
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

  return decoded.trim() || null;
}
