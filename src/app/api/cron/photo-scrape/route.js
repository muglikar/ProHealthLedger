import { readDataFile, writeDataFile } from "@/lib/github";

/**
 * GET /api/cron/photo-scrape
 *
 * Vercel Cron handler that scrapes LinkedIn profile photos for photoless
 * profiles and users. Designed to run daily, processing a small batch
 * with polite delays to avoid LinkedIn rate-limiting.
 *
 * Security: requires CRON_SECRET header match.
 *
 * LinkedIn anti-scrape strategy:
 * - Process only 5 entries per run (~2 min total)
 * - Random 10-30s delays between requests
 * - Rotate User-Agent strings
 * - Track failures with exponential backoff (skip recently-failed slugs)
 * - Direct LinkedIn fetch + Google SERP fallback
 */

export const maxDuration = 120; // 2 minute timeout for Vercel

const BATCH_SIZE = 5;
const MIN_DELAY_MS = 10_000;
const MAX_DELAY_MS = 30_000;
const BACKOFF_DAYS = 2; // skip slugs that failed within this window

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

const PLACEHOLDER_PATTERNS = [
  "ghost-person",
  "default-avatar",
  "static.licdn.com/aero",
  "0_0_0_0_0",
];

function isPlaceholder(url) {
  if (!url) return true;
  return PLACEHOLDER_PATTERNS.some((p) => url.includes(p));
}

function randomDelay() {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((r) => setTimeout(r, ms));
}

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithTimeout(url, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        "User-Agent": randomUA(),
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractPhotoFromHtml(html) {
  if (!html) return null;
  const patterns = [
    /<meta\s+(?:[^>]*?\s+)?(?:property|name)="og:image"\s+content="([^"]+)"/gi,
    /<meta\s+content="([^"]+)"\s+(?:property|name)="og:image"/gi,
  ];
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const src = match[1].replace(/&amp;/g, "&");
      if (!isPlaceholder(src) && src.startsWith("http")) return src;
    }
  }
  return null;
}

async function scrapePhoto(slug) {
  // Strategy 1: Direct LinkedIn
  const html = await fetchWithTimeout(
    `https://www.linkedin.com/in/${encodeURIComponent(slug)}`
  );
  const direct = extractPhotoFromHtml(html);
  if (direct) return direct;

  // Brief pause before fallback
  await new Promise((r) => setTimeout(r, 2000));

  // Strategy 2: Google SERP for LinkedIn thumbnails
  const query = `site:linkedin.com/in/${encodeURIComponent(slug)}`;
  const serpHtml = await fetchWithTimeout(
    `https://www.google.com/search?q=${query}&hl=en`
  );
  if (serpHtml) {
    const imgRegex =
      /(?:src|data-src)="(https?:\/\/[^"]*media\.licdn\.com\/dms\/image[^"]*profile-displayphoto[^"]*)"/gi;
    const match = imgRegex.exec(serpHtml);
    if (match) return match[1].replace(/&amp;/g, "&");
  }

  return null;
}

function shouldAttempt(slug, attempts, today) {
  const entry = attempts[slug];
  if (!entry) return true;
  const lastAttempt = entry.last_attempt;
  if (!lastAttempt) return true;

  // Exponential backoff: 2^failures days, capped at 30
  const backoffDays = Math.min(
    30,
    BACKOFF_DAYS * Math.pow(2, Math.max(0, (entry.failures || 1) - 1))
  );
  const cutoff = new Date(lastAttempt);
  cutoff.setDate(cutoff.getDate() + backoffDays);
  return new Date(today) >= cutoff;
}

export async function GET(req) {
  // Security check
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const results = { profiles: [], users: [], errors: [] };

  try {
    // Read data
    const { data: profiles, sha: profilesSha } = await readDataFile(
      "data/profiles/_index.json"
    );
    const { data: users, sha: usersSha } = await readDataFile(
      "data/users/_index.json"
    );
    const { data: scrapeLog, sha: logSha } = await readDataFile(
      "data/photo_scrape_log.json"
    );

    const log = scrapeLog || { last_run: null, attempts: {} };
    const attempts = log.attempts || {};

    // Build candidate list: photoless profiles + users
    const candidates = [];

    for (const p of profiles || []) {
      if (p.profile_photo_url || !p.slug) continue;
      if (shouldAttempt(p.slug, attempts, today)) {
        candidates.push({ type: "profile", slug: p.slug, entry: p });
      }
    }

    // For users, derive LinkedIn slug from various sources
    const userSlugMap = {};
    for (const u of users || []) {
      if (u.linkedin_url) {
        const m = u.linkedin_url.match(
          /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/
        );
        if (m) userSlugMap[u.user_id] = m[1].toLowerCase();
      }
    }
    // Also scan profile submissions for submitter LinkedIn URLs
    for (const p of profiles || []) {
      if (Array.isArray(p.submissions)) {
        for (const s of p.submissions) {
          if (s.user && s.submitter_linkedin_url && !userSlugMap[s.user]) {
            const m = s.submitter_linkedin_url.match(
              /linkedin\.com\/in\/([a-zA-Z0-9_-]+)/
            );
            if (m) userSlugMap[s.user] = m[1].toLowerCase();
          }
        }
      }
    }

    for (const u of users || []) {
      if (u.image) continue;
      const slug = userSlugMap[u.user_id];
      if (!slug) continue;
      if (shouldAttempt(`user:${u.user_id}`, attempts, today)) {
        candidates.push({
          type: "user",
          slug,
          userId: u.user_id,
          entry: u,
        });
      }
    }

    // Take the batch
    const batch = candidates.slice(0, BATCH_SIZE);

    let profilesChanged = false;
    let usersChanged = false;

    for (let i = 0; i < batch.length; i++) {
      const candidate = batch[i];

      if (i > 0) await randomDelay();

      try {
        const photo = await scrapePhoto(candidate.slug);

        if (photo) {
          if (candidate.type === "profile") {
            candidate.entry.profile_photo_url = photo;
            profilesChanged = true;
            results.profiles.push(candidate.slug);
          } else {
            candidate.entry.image = photo;
            usersChanged = true;
            results.users.push(candidate.userId);
          }
          // Reset failures on success
          const key =
            candidate.type === "user"
              ? `user:${candidate.userId}`
              : candidate.slug;
          attempts[key] = { last_attempt: today, failures: 0 };
        } else {
          const key =
            candidate.type === "user"
              ? `user:${candidate.userId}`
              : candidate.slug;
          const prev = attempts[key] || { failures: 0 };
          attempts[key] = {
            last_attempt: today,
            failures: (prev.failures || 0) + 1,
          };
        }
      } catch (err) {
        results.errors.push(`${candidate.slug}: ${err.message}`);
        const key =
          candidate.type === "user"
            ? `user:${candidate.userId}`
            : candidate.slug;
        const prev = attempts[key] || { failures: 0 };
        attempts[key] = {
          last_attempt: today,
          failures: (prev.failures || 0) + 1,
        };
      }
    }

    // Write updated data
    log.last_run = new Date().toISOString();
    log.attempts = attempts;

    if (profilesChanged) {
      await writeDataFile(
        "data/profiles/_index.json",
        profiles,
        profilesSha,
        { message: `chore(cron): auto-scraped ${results.profiles.length} profile photo(s)` }
      );
    }

    if (usersChanged) {
      await writeDataFile("data/users/_index.json", users, usersSha, {
        message: `chore(cron): auto-scraped ${results.users.length} user photo(s)`,
      });
    }

    await writeDataFile("data/photo_scrape_log.json", log, logSha, {
      message: `chore(cron): update photo scrape log (${today})`,
    });

    return Response.json({
      ok: true,
      batch_size: batch.length,
      candidates_remaining: candidates.length - batch.length,
      profiles_updated: results.profiles,
      users_updated: results.users,
      errors: results.errors,
    });
  } catch (err) {
    return Response.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
