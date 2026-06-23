/** Each positive vouch earns 1 flag credit; each negative vote uses 1 credit. */
export const VOUCHES_PER_FLAG = 1;

export function flagCreditsEarned(yesCount) {
  return Math.max(0, Number(yesCount) || 0);
}

/** Credits = positive vouches minus flags already used. */
export function flagsAvailable(userEntry) {
  if (!userEntry) return 0;
  const yes = userEntry.yes_count ?? 0;
  const no = userEntry.no_count ?? 0;
  if (yes < 1) return 0;
  return Math.max(0, yes - no);
}

export function canSubmitNegativeVote(userEntry) {
  return flagsAvailable(userEntry) > 0;
}

/**
 * Positive vouches still needed for the next flag credit when currently at 0 available.
 * Returns 0 if the user already has at least one unused credit.
 */
export function vouchesUntilNextCredit(yesCount, noCount) {
  const y = Math.max(0, Number(yesCount) || 0);
  const n = Math.max(0, Number(noCount) || 0);
  if (y < 1) return 1;
  const avail = Math.max(0, y - n);
  if (avail > 0) return 0;
  return Math.max(1, n - y + 1);
}

/** Get the date of the user's last vouch (vote === "yes") */
export function getLastVouchDate(userEntry) {
  if (!userEntry || !Array.isArray(userEntry.contributions)) return null;
  // Iterate backwards to find the latest contribution
  for (let i = userEntry.contributions.length - 1; i >= 0; i--) {
    const c = userEntry.contributions[i];
    if (c.vote === "yes" && c.date) {
      return c.date;
    }
  }
  return null;
}

/** Check if the user has an active view credit (vouched in the last 7 days) */
export function hasActiveViewCredit(userEntry) {
  const lastVouchDateStr = getLastVouchDate(userEntry);
  if (!lastVouchDateStr) {
    return { active: false, expiresAt: null, daysLeft: 0 };
  }

  // Parse as local/UTC midnight to avoid timezone shifts
  const lastVouchDate = new Date(lastVouchDateStr + "T00:00:00");
  const durationDays = typeof process !== "undefined" && process.env.VIEW_CREDIT_DURATION_DAYS
    ? parseInt(process.env.VIEW_CREDIT_DURATION_DAYS, 10)
    : 7;

  const expiresDate = new Date(lastVouchDate);
  expiresDate.setDate(expiresDate.getDate() + durationDays);

  const today = new Date();
  const timeDiff = expiresDate.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  const active = timeDiff > 0;

  return {
    active,
    expiresAt: expiresDate.toISOString(),
    daysLeft,
  };
}

