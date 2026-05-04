import { ImageResponse } from "next/og";
import { formatVouchOgLines, VouchOgCardJsx } from "@/lib/og-vouch-card";

/** LinkedIn spec: 1200×627 (1.91 : 1). */
export const VOUCH_OG_WIDTH = 1200;
export const VOUCH_OG_HEIGHT = 627;

const CACHE_HEADERS = {
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cache-Control":
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200",
};

const IMAGE_SIZE = { width: VOUCH_OG_WIDTH, height: VOUCH_OG_HEIGHT };

/**
 * Single implementation for `/api/og` and `opengraph-image` (same PNG bytes).
 * `cleanVoucher` / `cleanVouchee` are human-readable names (already decoded).
 * Uses the default system font (Noto Sans) bundled with next/og — fast and reliable.
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
