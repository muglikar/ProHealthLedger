#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const profilesPath = path.join(root, "data/profiles/_index.json");
const usersPath = path.join(root, "data/users/_index.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function tokenizeName(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function subFromUserId(userId) {
  const s = String(userId || "");
  if (!s.toLowerCase().startsWith("linkedin:")) return "";
  return s.slice("linkedin:".length).toLowerCase();
}

const profiles = readJson(profilesPath);
const users = readJson(usersPath);

const slugToLinkedinUrl = new Map();
for (const p of profiles) {
  if (p?.slug && p?.linkedin_url) slugToLinkedinUrl.set(String(p.slug), String(p.linkedin_url));
}

const inferredByUserId = new Map();

// Deterministic mapping for built-in LinkedIn admin sub used by this project.
if (slugToLinkedinUrl.has("muglikar")) {
  inferredByUserId.set("linkedin:caoso1oig0", slugToLinkedinUrl.get("muglikar"));
}

for (const u of users) {
  const userId = String(u?.user_id || "");
  if (!userId.toLowerCase().startsWith("linkedin:")) continue;
  if (inferredByUserId.has(userId.toLowerCase())) continue;

  const tokens = tokenizeName(u?.display_name || "");
  if (tokens.length < 2) continue;

  const candidates = [];
  for (const p of profiles) {
    const slugTokens = tokenizeName(p?.slug || "");
    const publicTokens = tokenizeName(p?.public_name || "");
    const profileTokens = new Set([...slugTokens, ...publicTokens]);
    if (tokens.every((t) => profileTokens.has(t))) {
      candidates.push(p);
    }
  }
  if (candidates.length === 1 && candidates[0]?.linkedin_url) {
    inferredByUserId.set(userId.toLowerCase(), String(candidates[0].linkedin_url));
  }
}

let touchedSubmissions = 0;
for (const p of profiles) {
  for (const s of p?.submissions || []) {
    if (typeof s?.submitter_linkedin_url === "string" && s.submitter_linkedin_url) {
      continue;
    }
    const userId = String(s?.user || "").toLowerCase();
    const mapped = inferredByUserId.get(userId);
    if (!mapped) continue;
    s.submitter_linkedin_url = mapped;
    touchedSubmissions += 1;
  }
}

writeJson(profilesPath, profiles);

console.log(
  JSON.stringify(
    {
      submitterMappings: inferredByUserId.size,
      submissionsBackfilled: touchedSubmissions,
    },
    null,
    2
  )
);
