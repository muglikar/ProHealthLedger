function parseList(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeSlugToken(raw) {
  if (!raw || typeof raw !== "string") return "";
  const m = raw.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (m) return m[1].toLowerCase();
  const t = raw.replace(/^\/+|\/+$/g, "");
  return /^[a-zA-Z0-9_-]+$/.test(t) ? t.toLowerCase() : "";
}

/**
 * Exact-match list (no substring matching) of protected LinkedIn /in/ slugs
 * for which negative votes are blocked. Configure via env:
 *
 *   PROTECTED_FROM_FLAG_SLUGS=muglikar,another-handle
 *
 * URL values are accepted and normalized:
 *   PROTECTED_FROM_FLAG_SLUGS=https://www.linkedin.com/in/muglikar/
 */
export function listProtectedFlagSlugs() {
  const set = new Set();
  for (const token of parseList(process.env.PROTECTED_FROM_FLAG_SLUGS)) {
    const slug = normalizeSlugToken(token);
    if (slug) set.add(slug);
  }
  return [...set];
}

export function isFlagBlockedForLinkedinUrl(_linkedinUrl, slug) {
  const s = normalizeSlugToken(String(slug || ""));
  if (!s) return false;
  const blocked = new Set(listProtectedFlagSlugs());
  return blocked.has(s);
}
