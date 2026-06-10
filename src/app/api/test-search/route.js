import { resolveLinkedinProfile } from "@/lib/linkedin-name-resolve";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") || "iantarakey";
  
  try {
    const result = await resolveLinkedinProfile(slug);
    return Response.json({
      slug,
      result,
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
