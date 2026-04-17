import { textCardOgResponse } from "@/lib/og-text-card";

/** Node: Edge + Google font fetch produced empty image bodies on Vercel; LinkedIn then used logo.png. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const alt =
  "ProHealthLedger — Know who you are working with before you commit.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return textCardOgResponse();
}
