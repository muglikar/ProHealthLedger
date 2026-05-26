#!/usr/bin/env node

/**
 * Batch photo scraper for all photoless profiles and users.
 *
 * Scrapes LinkedIn og:image (direct fetch) with Google SERP fallback.
 * Updates data/profiles/_index.json and data/users/_index.json in place.
 *
 * Usage:  node scripts/batch-photo-scrape.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PROFILES_PATH = resolve(ROOT, "data/profiles/_index.json");
const USERS_PATH = resolve(ROOT, "data/users/_index.json");

const DRY_RUN = process.argv.includes("--dry-run");
const FETCH_TIMEOUT_MS = 6000;
const DELAY_BETWEEN_MS = 1500; // Be polite to LinkedIn / Google

// ── Photo extraction helpers ──

const PLACEHOLDER_PATTERNS = [
  "ghost-person",
  "default-avatar",
  "static.licdn.com/aero",
  "/dms/image/v2/C",
  "0_0_0_0_0",
];

function isPlaceholder(url) {
  if (!url) return true;
  return PLACEHOLDER_PATTERNS.some((p) => url.includes(p));
}

function extractPhotoFromHtml(html) {
  if (!html) return null;
  const ogRegex = /<meta\s+(?:[^>]*?\s+)?(?:property|name)="og:image"\s+content="([^"]+)"/gi;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    const src = match[1].replace(/&amp;/g, "&");
    if (!isPlaceholder(src) && src.startsWith("http")) return src;
  }
  // Also try reversed attribute order
  const ogRegex2 = /<meta\s+content="([^"]+)"\s+(?:property|name)="og:image"/gi;
  while ((match = ogRegex2.exec(html)) !== null) {
    const src = match[1].replace(/&amp;/g, "&");
    if (!isPlaceholder(src) && src.startsWith("http")) return src;
  }
  return null;
}

async function fetchWithTimeout(url, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
        ...headers,
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

// Strategy 1: Direct LinkedIn fetch
async function directLinkedInPhoto(slug) {
  const html = await fetchWithTimeout(`https://www.linkedin.com/in/${encodeURIComponent(slug)}`);
  return extractPhotoFromHtml(html);
}

// Strategy 2: Google SERP — look for LinkedIn profile thumbnails
async function serpPhoto(slug) {
  const query = `site:linkedin.com/in/${encodeURIComponent(slug)}`;
  const url = `https://www.google.com/search?q=${query}&hl=en`;
  const html = await fetchWithTimeout(url);
  if (!html) return null;

  // Look for licdn profile-displayphoto URLs in image tags
  const imgRegex = /(?:src|data-src)="(https?:\/\/[^"]*media\.licdn\.com\/dms\/image[^"]*profile-displayphoto[^"]*)"/gi;
  const match = imgRegex.exec(html);
  if (match) {
    return match[1].replace(/&amp;/g, "&");
  }
  return null;
}

// Combined: try direct, then SERP
async function resolvePhoto(slug) {
  const direct = await directLinkedInPhoto(slug);
  if (direct) return direct;

  await sleep(500);
  const serp = await serpPhoto(slug);
  return serp || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──

async function main() {
  console.log(`\n🔍 Batch Photo Scraper ${DRY_RUN ? "(DRY RUN)" : ""}\n`);

  // --- Profiles ---
  const profiles = JSON.parse(readFileSync(PROFILES_PATH, "utf-8"));
  const profilesNeedPhoto = profiles.filter((p) => !p.profile_photo_url && p.slug);

  console.log(`📋 Profiles: ${profiles.length} total, ${profilesNeedPhoto.length} need photos\n`);

  let profilesUpdated = 0;
  for (let i = 0; i < profilesNeedPhoto.length; i++) {
    const p = profilesNeedPhoto[i];
    const slug = p.slug;
    const name = p.public_name || slug;

    process.stdout.write(`  [${i + 1}/${profilesNeedPhoto.length}] ${name} (${slug})... `);

    const photo = await resolvePhoto(slug);
    if (photo) {
      p.profile_photo_url = photo;
      profilesUpdated++;
      console.log(`✅ found`);
    } else {
      console.log(`⏭  no photo found`);
    }

    if (i < profilesNeedPhoto.length - 1) await sleep(DELAY_BETWEEN_MS);
  }

  console.log(`\n📸 Profiles updated: ${profilesUpdated}/${profilesNeedPhoto.length}\n`);

  // --- Users ---
  const users = JSON.parse(readFileSync(USERS_PATH, "utf-8"));
  const usersNeedPhoto = users.filter((u) => !u.image);

  // For users, we need to find their LinkedIn slug. Sources:
  // 1. linkedin_url field
  // 2. user_id that matches a profile slug (they voted on themselves)
  // 3. Submissions in profiles that have submitter_linkedin_url
  // 4. Profile slugs from contributions (if user_id looks like a LinkedIn identifier)

  // Build a lookup from submissions
  const userIdToSlug = {};
  for (const u of users) {
    if (u.linkedin_url) {
      const m = u.linkedin_url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
      if (m) userIdToSlug[u.user_id] = m[1].toLowerCase();
    }
  }
  // Also scan profiles for submitter LinkedIn URLs
  for (const p of profiles) {
    if (Array.isArray(p.submissions)) {
      for (const s of p.submissions) {
        if (s.user && s.submitter_linkedin_url && !userIdToSlug[s.user]) {
          const m = s.submitter_linkedin_url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
          if (m) userIdToSlug[s.user] = m[1].toLowerCase();
        }
      }
    }
  }

  console.log(`👤 Users: ${users.length} total, ${usersNeedPhoto.length} need photos`);
  console.log(`   LinkedIn slug mappings found: ${Object.keys(userIdToSlug).length}\n`);

  let usersUpdated = 0;
  for (let i = 0; i < usersNeedPhoto.length; i++) {
    const u = usersNeedPhoto[i];
    const slug = userIdToSlug[u.user_id];
    const name = u.display_name || u.user_id;

    process.stdout.write(`  [${i + 1}/${usersNeedPhoto.length}] ${name}... `);

    if (!slug) {
      console.log(`⏭  no LinkedIn slug known`);
      continue;
    }

    const photo = await resolvePhoto(slug);
    if (photo) {
      u.image = photo;
      usersUpdated++;
      console.log(`✅ found`);
    } else {
      console.log(`⏭  no photo found`);
    }

    if (i < usersNeedPhoto.length - 1) await sleep(DELAY_BETWEEN_MS);
  }

  console.log(`\n📸 Users updated: ${usersUpdated}/${usersNeedPhoto.length}\n`);

  // --- Write ---
  if (DRY_RUN) {
    console.log("🚫 Dry run — not writing files.\n");
  } else {
    writeFileSync(PROFILES_PATH, JSON.stringify(profiles, null, 2) + "\n");
    writeFileSync(USERS_PATH, JSON.stringify(users, null, 2) + "\n");
    console.log("✅ Files written.\n");
  }

  console.log(`Summary: ${profilesUpdated} profile photos + ${usersUpdated} user photos scraped.\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
