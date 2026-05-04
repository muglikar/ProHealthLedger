import { ImageResponse } from "next/og";
import { formatVouchOgLines, VouchOgCardJsx } from "@/lib/og-vouch-card";

/** Logical card size (1.91:1). LinkedIn recommends ~1200×627; we raster at 2× for sharp downscale. */
export const VOUCH_OG_RASTER_SCALE = 2;
export const VOUCH_OG_WIDTH = 1200 * VOUCH_OG_RASTER_SCALE;
export const VOUCH_OG_HEIGHT = 627 * VOUCH_OG_RASTER_SCALE;

const CACHE_HEADERS = {
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cache-Control":
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200",
};

const IMAGE_SIZE = { width: VOUCH_OG_WIDTH, height: VOUCH_OG_HEIGHT };

/**
 * Load the Monda variable font from public/fonts at the edge.
 * Falls back gracefully so the OG image never fails.
 */
async function loadMondaFont() {
  try {
    // In Vercel Edge Runtime, fetch from the deployed URL
    const fontUrl = new URL("/fonts/Monda-Variable.ttf", process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || "https://prohealthledger.org"
    );
    const res = await fetch(fontUrl, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
    return await res.arrayBuffer();
  } catch (e) {
    console.error("Monda font load failed, falling back to system font:", e.message);
    return null;
  }
}

/** Cached font promise — loaded once per cold start. */
let _fontPromise = null;
function getMondaFont() {
  if (!_fontPromise) _fontPromise = loadMondaFont();
  return _fontPromise;
}

/**
 * Single implementation for `/api/og` and `opengraph-image` (same PNG bytes).
 * `cleanVoucher` / `cleanVouchee` are human-readable names (already decoded).
 */
export async function createVouchOgImageResponse(cleanVoucher, cleanVouchee) {
  const { voucherText, voucheeText, nameSize } = formatVouchOgLines(
    cleanVoucher || "",
    cleanVouchee || ""
  );

  const mondaData = await getMondaFont();

  const fonts = mondaData
    ? [
        { name: "Monda", data: mondaData, weight: 400, style: "normal" },
        { name: "Monda", data: mondaData, weight: 700, style: "normal" },
      ]
    : undefined;

  return new ImageResponse(
    <VouchOgCardJsx
      voucherText={voucherText}
      voucheeText={voucheeText}
      nameSize={nameSize}
      scale={VOUCH_OG_RASTER_SCALE}
    />,
    {
      ...IMAGE_SIZE,
      headers: CACHE_HEADERS,
      ...(fonts ? { fonts } : {}),
    }
  );
}
