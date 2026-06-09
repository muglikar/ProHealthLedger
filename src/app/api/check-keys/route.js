export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    hasZyte: !!process.env.ZYTE_API_KEY,
    hasScraper: !!process.env.SCRAPER_API_KEY,
  });
}
