import { buildOgHomeImageResponse } from "@/lib/og-home-preview";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return buildOgHomeImageResponse();
}
