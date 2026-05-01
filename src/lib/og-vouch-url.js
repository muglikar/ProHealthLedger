/**
 * Social crawlers (especially LinkedIn) cache link previews by og:image URL.
 * When /api/og briefly returned empty bodies, LinkedIn stored a fallback
 * screenshot. Bump this string after any OG output change to force a refetch.
 */
export const OG_VOUCH_PREVIEW_VERSION = "2";

export function buildVouchOgUrl(origin, voucherName, voucheeName) {
  const base = (origin || "").replace(/\/+$/, "");
  const q = new URLSearchParams({
    voucherName: String(voucherName ?? ""),
    voucheeName: String(voucheeName ?? ""),
    v: OG_VOUCH_PREVIEW_VERSION,
  });
  return `${base}/api/og?${q.toString()}`;
}
