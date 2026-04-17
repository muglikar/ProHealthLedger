import { lightSocialImageResponse } from "@/lib/og-light-social";

export const runtime = "edge";
/** Avoid stale OG PNG on CDNs / LinkedIn after copy or design updates. */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const alt =
  "ProHealthLedger — Know who you are working with before you commit.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return lightSocialImageResponse();
}
