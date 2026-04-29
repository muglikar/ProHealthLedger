import { readRepoJson, writeRepoJson } from "./github";

const LOG_PATH = "data/moderation_log.json";

function isLogArray(value) {
  return Array.isArray(value);
}

/**
 * Append-only public moderation log. Anyone reading the repo can audit which
 * comments were approved, redacted, or un-redacted, by whom, and when.
 *
 * Each event:
 *   { issue, action, moderator, at, category? }
 *
 * Action ∈ "approve" | "reject" | "unredact"
 */
export async function appendModerationLog(event) {
  const { data, sha } = await readRepoJson(LOG_PATH);
  const list = isLogArray(data) ? data : [];
  list.push(event);
  await writeRepoJson(
    LOG_PATH,
    list,
    sha,
    `Moderation log: ${event.action} #${event.issue}`
  );
}

export async function readModerationLog() {
  const { data } = await readRepoJson(LOG_PATH);
  return isLogArray(data) ? data : [];
}
