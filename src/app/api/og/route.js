import { ImageResponse } from "next/og";
import {
  displayFromParam,
  formatVouchOgLines,
  VouchOgCardJsx,
} from "@/lib/og-vouch-card";

export const runtime = "edge";

/**
 * Pattern from f6513d3: Edge ImageResponse, no custom font binaries — Satori-safe.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const rawMax = 100;
    const cleanVoucher = displayFromParam(
      searchParams.get("voucherName"),
      "A Colleague"
    ).slice(0, rawMax);
    const cleanVouchee = displayFromParam(
      searchParams.get("voucheeName"),
      "Professional"
    ).slice(0, rawMax);

    const { voucherText, voucheeText, nameSize } = formatVouchOgLines(
      cleanVoucher,
      cleanVouchee
    );

    return new ImageResponse(
      <VouchOgCardJsx
        voucherText={voucherText}
        voucheeText={voucheeText}
        nameSize={nameSize}
        scale={1}
      />,
      {
        width: 1200,
        height: 630,
        headers: {
          "Cross-Origin-Resource-Policy": "cross-origin",
          // d64ed65-era behavior worked with platform CDNs; avoid max-age=0 so
          // crawlers (LinkedIn) don't treat the asset as always-stale / fall back to screenshots.
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200",
        },
      }
    );
  } catch (e) {
    console.error("OG image generation error:", e);
    return new Response("OG generation failed", { status: 500 });
  }
}
