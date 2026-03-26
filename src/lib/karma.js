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
