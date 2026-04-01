import { readDataFile, writeDataFile } from "./github";
import { createHash } from "node:crypto";

const DATA_PATH = "data/referrals/_index.json";

/**
 * Generate a short, unique referral code from userId + profileSlug + timestamp.
 */
export function generateRefCode(userId, profileSlug) {
  const raw = `${userId}:${profileSlug}:${Date.now()}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 8);
}

/**
 * Create a new referral entry in the data file.
 * Returns the created referral object.
 */
export async function createReferral(
  userId,
  displayName,
  profileSlug,
  profileName
) {
  const refCode = generateRefCode(userId, profileSlug);
  const { data: referrals, sha } = await readDataFile(DATA_PATH);

  // If the user already has a referral for this profile, return existing one
  const existing = referrals.find(
    (r) => r.sharer_id === userId && r.profile_slug === profileSlug
  );
  if (existing) return existing;

  const referral = {
    ref_code: refCode,
    sharer_id: userId,
    sharer_name: displayName,
    profile_slug: profileSlug,
    profile_name: profileName,
    created_at: new Date().toISOString().split("T")[0],
    clicks: 0,
    signups: [],
  };

  referrals.push(referral);

  await writeDataFile(
    DATA_PATH,
    referrals,
    sha,
    `New referral ${refCode} by ${userId} for ${profileSlug}`
  );

  return referral;
}

/**
 * Record a click for a referral code.
 */
export async function recordClick(refCode) {
  const { data: referrals, sha } = await readDataFile(DATA_PATH);
  const referral = referrals.find((r) => r.ref_code === refCode);
  if (!referral) return null;

  referral.clicks = (referral.clicks || 0) + 1;

  await writeDataFile(
    DATA_PATH,
    referrals,
    sha,
    `Click on referral ${refCode} (total: ${referral.clicks})`
  );

  return referral;
}

/**
 * Record that a new user signed up via a referral code.
 */
export async function recordSignup(refCode, newUserId) {
  const { data: referrals, sha } = await readDataFile(DATA_PATH);
  const referral = referrals.find((r) => r.ref_code === refCode);
  if (!referral) return null;

  if (!Array.isArray(referral.signups)) referral.signups = [];

  // Avoid duplicates
  if (referral.signups.includes(newUserId)) return referral;

  referral.signups.push(newUserId);

  await writeDataFile(
    DATA_PATH,
    referrals,
    sha,
    `Signup via referral ${refCode}: ${newUserId}`
  );

  return referral;
}

/**
 * Get all referral stats for a specific user.
 */
export async function getReferralsByUser(userId) {
  const { data: referrals } = await readDataFile(DATA_PATH);
  return referrals.filter((r) => r.sharer_id === userId);
}

/**
 * Get all referral data (admin/public telemetry view).
 */
export async function getAllReferrals() {
  const { data: referrals } = await readDataFile(DATA_PATH);
  return referrals;
}
