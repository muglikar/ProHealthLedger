import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildOgHomeImageResponse } from "@/lib/og-home-preview";

/** Node loads the PNG bytes so OG generation never depends on a hot URL (CDN / LinkedIn cache). */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const logoPath = path.join(process.cwd(), "public", "apple-touch-icon.png");
  const buf = await readFile(logoPath);
  const logoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return buildOgHomeImageResponse(logoDataUrl);
}
