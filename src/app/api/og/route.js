import { displayFromParam } from "@/lib/og-vouch-card";
import { createVouchOgImageResponse } from "@/lib/create-vouch-og-image-response";

export const runtime = "edge";

/**
 * GET `/api/og?voucherName=&voucheeName=` — query-style OG (legacy, direct links).
 * Metadata and LinkedIn share prefer `/p/.../opengraph-image` (see `opengraph-image.js`).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawMax = 100;
    const cleanVoucher = displayFromParam(
      searchParams.get("voucherName"),
      ""
    ).slice(0, rawMax);
    const cleanVouchee = displayFromParam(
      searchParams.get("voucheeName"),
      ""
    ).slice(0, rawMax);

    return createVouchOgImageResponse(cleanVoucher, cleanVouchee);
  } catch (e) {
    console.error("OG image generation error:", e);
    return new Response("OG generation failed", { status: 500 });
  }
}
