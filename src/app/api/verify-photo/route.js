import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, writeDataFile } from "@/lib/github";

/**
 * POST /api/verify-photo
 * Body: { slug: string }
 *
 * Marks the profile photo as verified globally.
 * Requires authentication.
 */
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await req.json();
  const slug = (body.slug || "").trim().toLowerCase();
  if (!slug) {
    return Response.json({ error: "slug is required." }, { status: 400 });
  }

  const { data: profiles, sha } = await readDataFile("data/profiles/_index.json");
  if (!Array.isArray(profiles)) {
    return Response.json({ error: "Profile data unavailable." }, { status: 500 });
  }

  const profile = profiles.find((p) => p.slug === slug);
  if (!profile) {
    return Response.json({ error: "Profile not found." }, { status: 404 });
  }

  if (profile.photo_verified) {
    // Already verified
    return Response.json({ ok: true, verified: false });
  }

  profile.photo_verified = true;
  profile.photo_verified_by = session.userId;
  profile.photo_verified_at = new Date().toISOString().slice(0, 10);

  await writeDataFile("data/profiles/_index.json", profiles, sha, {
    message: `chore: verify photo for ${slug} (by ${session.userId})`,
  });

  return Response.json({ ok: true, verified: true });
}
