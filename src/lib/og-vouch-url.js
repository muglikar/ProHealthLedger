/**
 * Crawlers cache previews by image URL. Bump after OG fixes so caches refetch.
 * Permalink `og:image` uses `/api/og?…` (simple URL, matches historical working behavior).
 * `buildVouchOpengraphImageUrl` kept for optional tools / parity with `opengraph-image` route.
 */
export const OG_VOUCH_PREVIEW_VERSION = "18";

/** Permalink opengraph-image (preferred for crawlers). Uses raw path segments. */
export function buildVouchOpengraphImageUrl(
  origin,
  voucherSeg,
  voucheeSeg,
  slugSeg
) {
  const base = (origin || "").replace(/\/+$/, "");
  const v = encodeURIComponent(String(voucherSeg ?? ""));
  const u = encodeURIComponent(String(voucheeSeg ?? ""));
  const s = encodeURIComponent(String(slugSeg ?? ""));
  return `${base}/p/${v}/${u}/${s}/opengraph-image?v=${OG_VOUCH_PREVIEW_VERSION}`;
}

/** Query-style fallback (legacy / debugging). */
export function buildVouchOgUrl(origin, voucherName, voucheeName) {
  const base = (origin || "").replace(/\/+$/, "");
  const q = new URLSearchParams({
    voucherName: String(voucherName ?? ""),
    voucheeName: String(voucheeName ?? ""),
    v: OG_VOUCH_PREVIEW_VERSION,
  });
  return `${base}/api/og?${q.toString()}`;
}
