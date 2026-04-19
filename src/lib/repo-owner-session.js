/**
 * Public maintainer account ids for this repository (same values appear in `data/users`
 * and GitHub). Used as a last-resort admin check when env-based admin lists misconfigure.
 */
export const REPO_MAINTAINER_GITHUB = "github:muglikar";
export const REPO_MAINTAINER_LINKEDIN_CANONICAL = "linkedin:caoso1oig0";

export function isRepoMaintainerUserId(userId) {
  if (!userId || typeof userId !== "string") return false;
  const n = userId.toLowerCase();
  return n === REPO_MAINTAINER_GITHUB || n === REPO_MAINTAINER_LINKEDIN_CANONICAL;
}
