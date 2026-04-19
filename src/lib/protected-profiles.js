/**
 * Flags (negative votes) cannot target URLs or slugs containing this substring.
 */
export function isFlagBlockedForLinkedinUrl(linkedinUrl, slug) {
  const u = String(linkedinUrl || "").toLowerCase();
  const s = String(slug || "").toLowerCase();
  return u.includes("muglikar") || s.includes("muglikar");
}
