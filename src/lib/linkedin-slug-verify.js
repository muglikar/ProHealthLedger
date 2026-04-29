/**
 * Verify that a LinkedIn `/in/<slug>` URL actually resolves to a real LinkedIn
 * page before letting the website record a vote against it. Closes the
 * "fabricated slug" mass-pollution / defamation-amplifier vector — anyone
 * could previously vote against `linkedin.com/in/<random-string>` and
 * permanently dirty the ledger.
 *
 * Active policy (chosen 2026-04-29):
 *   C — one immediate retry on ambiguous responses (999 / 403 / 429 / 5xx /
 *       network error / timeout); if still ambiguous → block.
 *   D — verify every first-time slug; profiles already in
 *       `data/profiles/_index.json` are trusted (caller's responsibility).
 *   G — 24 h negative cache, 1 h positive cache (in-memory, per serverless
 *       instance — best-effort, not authoritative).
 *   J — when LinkedIn redirects `/in/<old>` → `/in/<new>` we treat `<new>` as
 *       the canonical slug and return it.
 *   K — applied at the caller (no per-slug exemption here).
 *
 * Returns one of:
 *   { verdict: "exists",   canonicalSlug: string }
 *   { verdict: "missing"  }
 *   { verdict: "ambiguous"}   // only after the retry
 */

const POSITIVE_TTL_MS = 60 * 60 * 1000;       // 1 hour
const NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000;  // 24 hours
const FETCH_TIMEOUT_MS = 4000;
const RETRY_DELAY_MS = 250;
const MAX_REDIRECT_DEPTH = 2;

/** In-memory cache. Best-effort: lifetime is bounded by the serverless instance. */
const cache = new Map();

function readCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.until) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key, value, ttlMs) {
  cache.set(key, { value, until: Date.now() + ttlMs });
}

function isWellFormedSlug(s) {
  return (
    typeof s === "string" &&
    s.length >= 2 &&
    s.length <= 100 &&
    /^[a-zA-Z0-9_-]+$/.test(s)
  );
}

/**
 * If a LinkedIn redirect points back to `/in/<otherSlug>`, return that slug;
 * otherwise null. Handles relative + absolute Location values.
 */
function extractSlugFromLocation(loc) {
  if (!loc || typeof loc !== "string") return null;
  let url;
  try {
    url = new URL(loc, "https://www.linkedin.com");
  } catch {
    return null;
  }
  if (!/(?:^|\.)linkedin\.com$/i.test(url.hostname)) return null;
  const m = url.pathname.match(/^\/in\/([^/]+)/i);
  if (!m) return null;
  let candidate;
  try {
    candidate = decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return null;
  }
  return isWellFormedSlug(candidate) ? candidate : null;
}

async function fetchSlugOnce(slug) {
  const url = `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ProHealthLedgerBot/1.0; +https://prohealthledger.org)",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function classifyResponse(res, originalSlug) {
  const status = res.status;

  if (status === 404 || status === 410) {
    return { verdict: "missing" };
  }

  if (status >= 200 && status < 300) {
    return { verdict: "exists", canonicalSlug: originalSlug };
  }

  if (status >= 300 && status < 400) {
    const loc = res.headers.get("location") || res.headers.get("Location");
    const target = extractSlugFromLocation(loc);
    if (target) {
      // Trust LinkedIn's own /in/ → /in/ redirect (policy J).
      return { verdict: "exists", canonicalSlug: target };
    }
    if (loc && /\/authwall/i.test(loc)) {
      // Auth wall = page exists, just gated for non-logged-in viewers.
      return { verdict: "exists", canonicalSlug: originalSlug };
    }
    if (loc && /\/404|notfound/i.test(loc)) {
      return { verdict: "missing" };
    }
    // Some other redirect — can't tell.
    return { verdict: "ambiguous" };
  }

  // 999 / 403 / 429 / 5xx → ambiguous.
  return { verdict: "ambiguous" };
}

/**
 * @param {string} slug LinkedIn `/in/<slug>` segment, case-insensitive.
 * @returns {Promise<{verdict:"exists",canonicalSlug:string}|{verdict:"missing"}|{verdict:"ambiguous"}>}
 */
export async function verifyLinkedinSlug(slug) {
  if (!isWellFormedSlug(slug)) return { verdict: "missing" };
  const lower = slug.toLowerCase();

  const cached = readCache(lower);
  if (cached) return cached;

  let lastVerdict = { verdict: "ambiguous" };

  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await fetchSlugOnce(lower);
    } catch {
      lastVerdict = { verdict: "ambiguous" };
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
      continue;
    }

    const verdict = classifyResponse(res, lower);
    if (verdict.verdict === "exists") {
      writeCache(lower, verdict, POSITIVE_TTL_MS);
      // Cache the canonical slug under itself too, so subsequent direct calls
      // skip the LinkedIn round-trip when one side of an alias is hot.
      if (verdict.canonicalSlug && verdict.canonicalSlug !== lower) {
        writeCache(
          verdict.canonicalSlug,
          { verdict: "exists", canonicalSlug: verdict.canonicalSlug },
          POSITIVE_TTL_MS
        );
      }
      return verdict;
    }

    if (verdict.verdict === "missing") {
      writeCache(lower, verdict, NEGATIVE_TTL_MS);
      return verdict;
    }

    // Ambiguous → retry once (policy C).
    lastVerdict = verdict;
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  // Don't cache ambiguous — we want a fresh attempt next time.
  return lastVerdict;
}

// `MAX_REDIRECT_DEPTH` is exported for future use if we move to per-request
// recursion; today the helper trusts a single-hop /in/ redirect (J).
export const __INTERNALS__ = { MAX_REDIRECT_DEPTH };
