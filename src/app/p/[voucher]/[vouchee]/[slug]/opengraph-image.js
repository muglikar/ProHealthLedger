import { ImageResponse } from "next/og";
import {
  formatVouchOgLines,
  segmentToDisplayName,
  VouchOgCardJsx,
} from "@/lib/og-vouch-card";

/** 2x raster so LinkedIn/Facebook downscales to sharper cards than 1200px alone. */
export const size = { width: 2400, height: 1260 };
export const contentType = "image/png";
export const alt = "Professional Health Ledger — verified vouch card";

export default async function Image({ params }) {
  const resolved = await params;
  const cleanVoucher = segmentToDisplayName(resolved?.voucher);
  const cleanVouchee = segmentToDisplayName(resolved?.vouchee);
  const { voucherText, voucheeText, nameSize } = formatVouchOgLines(
    cleanVoucher || "A Colleague",
    cleanVouchee || "Professional"
  );

  return new ImageResponse(
    <VouchOgCardJsx
      voucherText={voucherText}
      voucheeText={voucheeText}
      nameSize={nameSize}
      scale={2}
    />,
    {
      width: size.width,
      height: size.height,
      headers: {
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    }
  );
}
