import { textCardOgResponse } from "@/lib/og-text-card";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const alt =
  "ProHealthLedger — Know who you are working with before you commit.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return textCardOgResponse();
}
