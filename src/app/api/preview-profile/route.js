import { resolveLinkedinProfile } from "@/lib/linkedin-name-resolve";

/**
 * GET /api/preview-profile?slug=jane-doe
 *
 * Returns { name, photo } for real-time preview as the user pastes a
 * LinkedIn URL in the vote form. Lightweight, best-effort, and cached
 * in-memory for the lifetime of the serverless function instance.
 */

const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim().toLowerCase();

  if (!slug || slug.length < 2 || slug.length > 100) {
    return Response.json({ name: null, photo: null });
  }

  // Check in-memory cache
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }

  try {
    const result = await resolveLinkedinProfile(slug);
    const data = { name: result.name || null, photo: result.photo || null };

    cache.set(slug, { data, ts: Date.now() });

    // Prevent unbounded cache growth
    if (cache.size > 500) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < 100; i++) cache.delete(oldest[i][0]);
    }

    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return Response.json({ name: null, photo: null });
  }
}
