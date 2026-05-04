import { createVouchOgImageResponse, VOUCH_OG_HEIGHT, VOUCH_OG_WIDTH } from "@/lib/create-vouch-og-image-response";
import { segmentToDisplayName } from "@/lib/og-vouch-card";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: VOUCH_OG_WIDTH, height: VOUCH_OG_HEIGHT };

/**
 * Path-based OG: `/p/{voucher}/{vouchee}/{slug}/opengraph-image`
 */
export default async function Image({ params }) {
  const resolvedParams = await params;
  const rawMax = 100;
  const cleanVoucher = segmentToDisplayName(resolvedParams?.voucher).slice(
    0,
    rawMax
  );
  const cleanVouchee = segmentToDisplayName(resolvedParams?.vouchee).slice(
    0,
    rawMax
  );

  return createVouchOgImageResponse(cleanVoucher, cleanVouchee);
}
