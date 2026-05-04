import { ImageResponse } from "next/og";
import { formatVouchOgLines, VouchOgCardJsx } from "@/lib/og-vouch-card";

/** LinkedIn spec: 1200×627 (1.91 : 1). No 2× scale — keeps generation fast and avoids blur on downscale. */
export const VOUCH_OG_WIDTH = 1200;
export const VOUCH_OG_HEIGHT = 627;

const CACHE_HEADERS = {
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cache-Control":
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200",
};

const IMAGE_SIZE = { width: VOUCH_OG_WIDTH, height: VOUCH_OG_HEIGHT };

/**
 * Top-level font fetch — resolved ONCE per cold start (standard Next.js OG pattern).
 * Uses the production CDN URL for the static asset in /public/fonts/.
 */
const mondaFontPromise = fetch(
  "https://prohealthledger.org/fonts/Monda-Variable.ttf"
)
  .then((res) => {
    if (!res.ok) throw new Error(`Font fetch ${res.status}`);
    return res.arrayBuffer();
  })
  .catch((e) => {
    console.error("Monda font load failed:", e.message);
    return null;
  });

/**
 * Single implementation for `/api/og` and `opengraph-image` (same PNG bytes).
 * `cleanVoucher` / `cleanVouchee` are human-readable names (already decoded).
 */
export async function createVouchOgImageResponse(cleanVoucher, cleanVouchee) {
  const { voucherText, voucheeText, nameSize } = formatVouchOgLines(
    cleanVoucher || "",
    cleanVouchee || ""
  );

  const mondaData = await mondaFontPromise;

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
      scale={1}
    />,
    {
      ...IMAGE_SIZE,
      headers: CACHE_HEADERS,
      ...(fonts ? { fonts } : {}),
    }
  );
}
