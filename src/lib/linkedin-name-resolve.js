/**
 * Resolve the real display name for a LinkedIn `/in/<slug>` profile by
 * fetching the public page and extracting the `<title>` tag. LinkedIn public
 * profiles typically render titles like:
 *
 *   "Deepak Dhole - Senior Engineer - Company X | LinkedIn"
 *   "Jane Doe | LinkedIn"
 *
 * We extract the first segment before " - " or " | " and strip LinkedIn noise.
 *
 * This is best-effort and non-blocking. It uses a multi-pronged approach:
 * 1. Direct fetch of the LinkedIn public profile.
 * 2. Fallback to searching Google (site:linkedin.com/in/<slug>) to extract
 *    the name from search results, bypassing LinkedIn's authwall.
 *
 * If all strategies fail (e.g., due to rate-limiting or captchas on Vercel IPs),
 * we gracefully return null and let the caller fall back to slug-based display names.
 */

const FETCH_TIMEOUT_MS = 5000;

/**
 * @param {string} slug - LinkedIn `/in/<slug>` handle (lowercase).
 * @returns {Promise<string|null>} The resolved real name, or null on failure.
 */
export async function resolveLinkedinName(slug) {
  if (!slug || typeof slug !== "string") return null;

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

    if (!res.ok) return null;

    // Read only the first ~32KB to avoid downloading full page resources.
    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = "";
    const decoder = new TextDecoder();
    const MAX_BYTES = 32768;

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      // Stop early once we've found a closing </title> tag.
      if (html.includes("</title>")) break;
    }
    reader.cancel().catch(() => {});

    const nameFromDirect = extractNameFromHtml(html);
    if (nameFromDirect) return nameFromDirect;
    
    // If direct extraction failed, try the SERP fallback.
    return fallbackToGoogleSerp(slug);
  } catch {
    // If direct fetch threw an error, attempt the SERP fallback.
    return fallbackToGoogleSerp(slug);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fallback Strategy: Scrape Google search results.
 * We query: site:linkedin.com/in/<slug>
 * And extract the title of the first search result.
 */
async function fallbackToGoogleSerp(slug) {
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
    
    // Google results typically contain <h3 class="...">Title - Company | LinkedIn</h3>
    // We look for h3 tags containing "LinkedIn"
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
 * Extract a person's name from LinkedIn page HTML.
 *
 * Strategies tried in priority order:
 * 1. `<title>…</title>` → "Deepak Dhole - Title - Company | LinkedIn"
 * 2. `og:title` meta tag → "Deepak Dhole - Title - Company"
 */
function extractNameFromHtml(html) {
  if (!html) return null;

  // Strategy 1: <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    const name = extractNameFromTitle(titleMatch[1]);
    if (name) return name;
  }

  // Strategy 2: og:title meta
  const ogMatch = html.match(
    /<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i
  );
  if (!ogMatch) {
    // Try reversed attribute order
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
 * Parse the name from a title string like:
 *   "Deepak Dhole - Senior Engineer - Company X | LinkedIn"
 *   "Jane Doe | LinkedIn"
 *   "(2) Deepak Dhole | LinkedIn"
 */
function extractNameFromTitle(raw) {
  if (!raw || typeof raw !== "string") return null;

  let s = raw.trim();

  // Remove notification count prefix: "(3) Name…"
  s = s.replace(/^\(\d+\)\s*/, "");

  // Remove "| LinkedIn" suffix
  s = s.replace(/\s*\|\s*LinkedIn\s*$/i, "");

  // Take the first segment before " - " (rest is job title / company)
  const firstSegment = s.split(/\s+-\s+/)[0].trim();

  if (!firstSegment) return null;

  // Sanity: must look like a name (at least 2 chars, not a URL, not "LinkedIn")
  if (firstSegment.length < 2) return null;
  if (/linkedin\.com/i.test(firstSegment)) return null;
  if (/^linkedin$/i.test(firstSegment)) return null;

  // Decode HTML entities
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
