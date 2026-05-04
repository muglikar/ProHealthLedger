import { ImageResponse } from "next/og";
import { formatVouchOgLines, VouchOgCardJsx } from "@/lib/og-vouch-card";

const CACHE_HEADERS = {
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cache-Control":
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200",
};

const IMAGE_SIZE = { width: 1200, height: 630 };

/**
 * Single implementation for `/api/og` and `opengraph-image` (same PNG bytes).
 * `cleanVoucher` / `cleanVouchee` are human-readable names (already decoded).
 */
export function createVouchOgImageResponse(cleanVoucher, cleanVouchee) {
  const { voucherText, voucheeText, nameSize } = formatVouchOgLines(
    cleanVoucher || "",
    cleanVouchee || ""
  );

  return new ImageResponse(
    <VouchOgCardJsx
      voucherText={voucherText}
      voucheeText={voucheeText}
      nameSize={nameSize}
      scale={1}
    />,
    {
      ...IMAGE_SIZE,
      headers: CACHE_HEADERS,
    }
  );
}
