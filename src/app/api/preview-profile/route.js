import { resolveLinkedinProfile } from "@/lib/linkedin-name-resolve";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile } from "@/lib/github";

export const dynamic = "force-dynamic";

/**
 * GET /api/preview-profile?slug=jane-doe
 *
 * Returns { name, photo, userVote } for real-time preview as the user pastes a
 * LinkedIn URL in the vote form. Lightweight, best-effort.
 */

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim().toLowerCase();

  if (!slug || slug.length < 2 || slug.length > 100) {
    return Response.json({ name: null, photo: null, userVote: { voted: false } });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.userId || null;

  try {
    const { data: profiles } = await readDataFile("data/profiles/_index.json").catch(() => ({ data: [] }));
    const profile = profiles.find((p) => p.slug === slug);

    let name = null;
    let photo = null;
    let resolutionSource = null;
    let confidence = 0;
    let resolvedAt = null;
    let originalPhotoUrl = null;

    if (profile && profile.public_name) {
      name = profile.public_name;
      photo = profile.profile_photo_url || null;
      resolutionSource = profile.resolution_source || "cache";
      confidence = profile.confidence ?? 1.0;
      resolvedAt = profile.resolved_at || null;
      originalPhotoUrl = profile.original_photo_url || null;
    } else {
      const result = await resolveLinkedinProfile(slug);
      name = result.name || null;
      photo = result.photo || null;
      resolutionSource = result.source || null;
      confidence = result.confidence ?? 0;
      resolvedAt = new Date().toISOString();
      originalPhotoUrl = result.photo || null;
    }

    const data = {
      name,
      photo,
      resolution_source: resolutionSource,
      confidence,
      resolved_at: resolvedAt,
      original_photo_url: originalPhotoUrl,
      userVote: { voted: false },
    };

    if (userId && profile) {
      const existingSubmission = profile.submissions?.find((s) => s.user === userId);
      if (existingSubmission) {
        data.userVote = {
          voted: true,
          vote: existingSubmission.vote,
          reason: existingSubmission.reason || "",
          reason_edited: Boolean(existingSubmission.reason_edited),
        };
      }
    }

    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (err) {
    console.error("[preview-profile] error:", err);
    return Response.json({ name: null, photo: null, userVote: { voted: false } });
  }
}
