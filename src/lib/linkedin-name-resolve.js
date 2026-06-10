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

async function resolveViaZyte(slug) {
  const apiKey = (process.env.ZYTE_API_KEY || "").trim();
  if (!apiKey) {
    console.log("[Zyte] ZYTE_API_KEY is not defined or is empty in process.env.");
    return null;
  }

  const maskedKey = apiKey.slice(0, 4) + "..." + apiKey.slice(-4) + ` (length: ${apiKey.length})`;
  console.log(`[Zyte] ZYTE_API_KEY present: ${maskedKey}`);

  const url = `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
  console.log(`[Zyte] Resolving public profile for slug: ${slug} via Zyte API...`);

  try {
    const res = await fetch("https://api.zyte.com/v1/extract", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(apiKey + ":"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        browserHtml: true,
        httpResponseBody: false,
      }),
    });

    console.log(`[Zyte] API Response Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.log(`[Zyte] API returned error body: ${errorText}`);
      return null;
    }

    const data = await res.json();
    const html = data.browserHtml;
    
    if (!html) {
      console.log("[Zyte] Browser HTML was empty in Zyte response.");
      return null;
    }

    console.log(`[Zyte] Successfully retrieved HTML. Length: ${html.length}`);

    const name = extractNameFromHtml(html);
    const photo = extractPhotoFromHtml(html);

    console.log(`[Zyte] Extracted name: ${name}, photo: ${photo ? "Found" : "Not Found"}`);

    return { name, photo };
  } catch (err) {
    console.log("[Zyte] Request failed with exception:", err.message);
    return null;
  }
}

async function resolveViaScraperApi(slug) {
  const apiKey = (process.env.SCRAPER_API_KEY || "").trim();
  if (!apiKey) {
    console.log("[ScraperAPI] SCRAPER_API_KEY is not defined or is empty in process.env.");
    return null;
  }

  const maskedKey = apiKey.slice(0, 4) + "..." + apiKey.slice(-4) + ` (length: ${apiKey.length})`;
  console.log(`[ScraperAPI] SCRAPER_API_KEY present: ${maskedKey}`);

  const url = `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
  console.log(`[ScraperAPI] Resolving public profile for slug: ${slug} via ScraperAPI...`);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);

  try {
    const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=false`;
    const res = await fetch(scraperUrl, { signal: ctrl.signal });
    clearTimeout(timer);

    console.log(`[ScraperAPI] Response Status: ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.log(`[ScraperAPI] API returned error: ${res.status} - ${errorText.slice(0, 200)}`);
      return null;
    }

    const html = await res.text();
    if (!html) {
      console.log("[ScraperAPI] HTML response was empty.");
      return null;
    }

    const name = extractNameFromHtml(html);
    const photo = extractPhotoFromHtml(html);

    console.log(`[ScraperAPI] Extracted name: ${name}, photo: ${photo ? "Found" : "Not Found"}`);
    return { name, photo };
  } catch (err) {
    clearTimeout(timer);
    console.log("[ScraperAPI] Request failed with exception:", err.message);
    return null;
  }
}

/**
 * @param {string} slug - LinkedIn `/in/<slug>` handle (lowercase).
 * @returns {Promise<{name: string|null, photo: string|null}>}
 */
export async function resolveLinkedinProfile(slug) {
  if (!slug || typeof slug !== "string") return { name: null, photo: null };

  // If Zyte API Key is configured, attempt resolution through Zyte first.
  if (process.env.ZYTE_API_KEY) {
    const zyteResult = await resolveViaZyte(slug);
    if (zyteResult && (zyteResult.name || zyteResult.photo)) {
      return zyteResult;
    }
  }

  // If Scraper API Key is configured, attempt resolution through ScraperAPI.
  if (process.env.SCRAPER_API_KEY) {
    const scraperResult = await resolveViaScraperApi(slug);
    if (scraperResult && (scraperResult.name || scraperResult.photo)) {
      return scraperResult;
    }
  }

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

    if (!res.ok) {
      const serp = await fallbackFromGoogleSerp(slug);
      if (serp.name || serp.photo) return serp;
      const yahoo = await fallbackFromYahooSerp(slug);
      if (yahoo.name || yahoo.photo) return yahoo;
      return await fallbackFromDuckDuckGoSerp(slug);
    }

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

    // If direct extraction failed entirely, try the SERP fallback.
    const serp = await fallbackFromGoogleSerp(slug);
    if (serp.name || serp.photo) {
      return { name: name || serp.name, photo: photo || serp.photo };
    }
    const yahooSerp = await fallbackFromYahooSerp(slug);
    if (yahooSerp.name || yahooSerp.photo) {
      return { name: name || yahooSerp.name, photo: photo || yahooSerp.photo };
    }
    const ddgSerp = await fallbackFromDuckDuckGoSerp(slug);
    return { name: name || ddgSerp.name, photo: photo || ddgSerp.photo };
  } catch {
    // If direct fetch threw an error, attempt the SERP fallback.
    const serp = await fallbackFromGoogleSerp(slug);
    if (serp.name || serp.photo) return serp;
    const yahooSerp = await fallbackFromYahooSerp(slug);
    if (yahooSerp.name || yahooSerp.photo) return yahooSerp;
    return await fallbackFromDuckDuckGoSerp(slug);
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
 * Fallback Strategy: Scrape Google search results for name AND photo.
 * Google search results for LinkedIn profiles sometimes contain:
 * - The person's name in the <h3> title
 * - A thumbnail image (from LinkedIn's og:image) in the result snippet
 * @returns {Promise<{name: string|null, photo: string|null}>}
 */
async function fallbackFromGoogleSerp(slug) {
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

    if (!res.ok) return { name: null, photo: null };

    const html = await res.text();

    // Extract name from h3 titles
    let name = null;
    const h3Regex = /<h3[^>]*>([^<]+LinkedIn[^<]*)<\/h3>/gi;
    let match;
    while ((match = h3Regex.exec(html)) !== null) {
      name = extractNameFromTitle(match[1]);
      if (name) break;
    }

    // Extract photo: Google often includes LinkedIn profile thumbnails
    // as img tags with src containing media.licdn.com
    let photo = null;
    const imgRegex = /(?:src|data-src)="(https?:\/\/[^"]*media\.licdn\.com\/dms\/image[^"]*profile-displayphoto[^"]*)"/gi;
    const imgMatch = imgRegex.exec(html);
    if (imgMatch) {
      photo = imgMatch[1].replace(/&amp;/g, "&");
    }

    return { name, photo };
  } catch {
    return { name: null, photo: null };
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

/**
 * Fallback Strategy: Scrape DuckDuckGo HTML search results for name AND photo.
 * This has much more lenient rate-limiting on cloud IPs compared to Google.
 * @returns {Promise<{name: string|null, photo: string|null}>}
 */
async function fallbackFromDuckDuckGoSerp(slug) {
  const query = `site:linkedin.com/in/${encodeURIComponent(slug)}`;
  const url = `https://html.duckduckgo.com/html/?q=${query}`;

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

    if (!res.ok) {
      console.log(`[DuckDuckGo] Search page returned status: ${res.status}`);
      return { name: null, photo: null };
    }

    const html = await res.text();

    // Look for the first result title which usually contains the name
    // e.g. class="result__a" href="..." >Jane Doe - Company X - LinkedIn</a>
    const ddgMatch = html.match(/class="result__a"[^>]*>([^<]+)\s*-.*LinkedIn/i) ||
                     html.match(/class="result__a"[^>]*>([^<]+)<\/a>/i);
    let name = null;
    if (ddgMatch && ddgMatch[1]) {
      name = extractNameFromTitle(ddgMatch[1]);
    }

    // Try to find any media.licdn.com thumbnail urls in the search results
    let photo = null;
    const imgRegex = /(?:src|data-src)="(https?:\/\/[^"]*media\.licdn\.com\/dms\/image[^"]*profile-displayphoto[^"]*)"/gi;
    const imgMatch = imgRegex.exec(html);
    if (imgMatch) {
      photo = imgMatch[1].replace(/&amp;/g, "&");
    }

    console.log(`[DuckDuckGo] Extracted name: ${name}, photo: ${photo ? "Found" : "Not Found"}`);
    return { name, photo };
  } catch (e) {
    console.log("[DuckDuckGo] Scrape exception:", e.message);
    return { name: null, photo: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fallback Strategy: Scrape Yahoo search results for name AND photo.
 * @returns {Promise<{name: string|null, photo: string|null}>}
 */
async function fallbackFromYahooSerp(slug) {
  const query = `${slug} linkedin`;
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;

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

    if (!res.ok) {
      console.log(`[Yahoo] Search page returned status: ${res.status}`);
      return { name: null, photo: null };
    }

    const html = await res.text();
    const aRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let name = null;
    let photo = null;

    while ((match = aRegex.exec(html)) !== null) {
      const rawHref = match[1];
      const rawText = match[2];
      
      let targetUrl = rawHref;
      const ruMatch = rawHref.match(/\/RU=([^/]+)/i);
      if (ruMatch) {
        try {
          targetUrl = decodeURIComponent(ruMatch[1]);
        } catch {}
      }

      const isTargetProfile = targetUrl.toLowerCase().includes(`/in/${slug}`);
      if (isTargetProfile) {
        let text = rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        // Remove Yahoo search result title link prefix (e.g. "LinkedInhttps://...")
        text = text.replace(/^LinkedInhttps?:\/\/[^\s]+(\s+›\s+[^\s]+)*/i, "").trim();
        text = text.replace(/^https?:\/\/[^\s]+(\s+›\s+[^\s]+)*/i, "").trim();

        name = extractNameFromTitle(text);
        if (name) {
          console.log(`[Yahoo] Resolved name: "${name}" from URL text: "${text}"`);
          break;
        }
      }
    }

    // Try to find any media.licdn.com thumbnail urls in the search page
    const imgRegex = /(?:src|data-src)="(https?:\/\/[^"]*media\.licdn\.com\/dms\/image[^"]*profile-displayphoto[^"]*)"/gi;
    const imgMatch = imgRegex.exec(html);
    if (imgMatch) {
      photo = imgMatch[1].replace(/&amp;/g, "&");
    }

    return { name, photo };
  } catch (e) {
    console.log("[Yahoo] Scrape exception:", e.message);
    return { name: null, photo: null };
  } finally {
    clearTimeout(timer);
  }
}
