import { resolveLinkedinProfile } from "@/lib/linkedin-name-resolve";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile } from "@/lib/github";

/**
 * GET /api/preview-profile?slug=jane-doe
 *
 * Returns { name, photo, userVote } for real-time preview as the user pastes a
 * LinkedIn URL in the vote form. Lightweight, best-effort, and cached
 * in-memory for the lifetime of the serverless function instance.
 */

const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim().toLowerCase();

  if (!slug || slug.length < 2 || slug.length > 100) {
    return Response.json({ name: null, photo: null, userVote: { voted: false } });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.userId || null;
  const cacheKey = `${userId || "anon"}:${slug}`;

  const bypass = searchParams.get("bypass") === "true";

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  if (!bypass && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json(cached.data, {
      headers: {
        "Cache-Control": userId ? "private, no-cache" : "public, max-age=300",
      },
    });
  }

  try {
    const result = await resolveLinkedinProfile(slug);
    const data = { name: result.name || null, photo: result.photo || null, userVote: { voted: false } };

    if (userId) {
      const { data: profiles } = await readDataFile("data/profiles/_index.json").catch(() => ({ data: [] }));
      const profile = profiles.find((p) => p.slug === slug);
      const existingSubmission = profile?.submissions?.find((s) => s.user === userId);
      if (existingSubmission) {
        data.userVote = {
          voted: true,
          vote: existingSubmission.vote,
          reason: existingSubmission.reason || "",
          reason_edited: Boolean(existingSubmission.reason_edited),
        };
      }
    }

    cache.set(cacheKey, { data, ts: Date.now() });

    // Prevent unbounded cache growth
    if (cache.size > 500) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < 100; i++) cache.delete(oldest[i][0]);
    }

    return Response.json(data, {
      headers: {
        "Cache-Control": userId ? "private, no-cache" : "public, max-age=300",
      },
    });
  } catch {
    return Response.json({ name: null, photo: null, userVote: { voted: false } });
  }
}
