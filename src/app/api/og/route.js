import { ImageResponse } from "next/og";
import { getMondaFontsForOg } from "@/lib/load-monda-og-fonts";
import {
  displayFromParam,
  formatVouchOgLines,
  VouchOgCardJsx,
} from "@/lib/og-vouch-card";

export const runtime = "edge";

/** Legacy query-param OG URL (e.g. share-linkedin internal fetch). */
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

    const fonts = await getMondaFontsForOg();

    return new ImageResponse(
      <VouchOgCardJsx
        voucherText={voucherText}
        voucheeText={voucheeText}
        nameSize={nameSize}
        scale={2}
      />,
      {
        width: 2400,
        height: 1260,
        fonts,
        headers: {
          "Cross-Origin-Resource-Policy": "cross-origin",
        },
      }
    );
  } catch (e) {
    console.error("OG image generation error:", e);
    return new Response("OG generation failed", { status: 500 });
  }
}
