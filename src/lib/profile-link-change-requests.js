import { readRepoJson, writeRepoJson } from "@/lib/github";

const REQUESTS_FILE = "data/profile_link_change_requests.json";

function normalizeList(raw) {
  return Array.isArray(raw) ? raw : [];
}

export async function listProfileLinkChangeRequests() {
  const { data, sha } = await readRepoJson(REQUESTS_FILE);
  return { requests: normalizeList(data), sha };
}

export async function createProfileLinkChangeRequest({
  profileSlug,
  currentLinkedinUrl,
  proposedLinkedinUrl,
  requestedBy,
  requestedByDisplayName,
}) {
  const { requests, sha } = await listProfileLinkChangeRequests();
  const now = new Date().toISOString();
  const existingPending = requests.find(
    (r) =>
      r &&
      r.status === "pending" &&
      r.profile_slug === profileSlug &&
      r.proposed_linkedin_url === proposedLinkedinUrl
  );
  if (existingPending) return { request: existingPending, alreadyExisted: true };

  const request = {
    id: `plcr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "pending",
    profile_slug: profileSlug,
    current_linkedin_url: currentLinkedinUrl,
    proposed_linkedin_url: proposedLinkedinUrl,
    requested_by: requestedBy || "unknown",
    requested_by_display_name: requestedByDisplayName || requestedBy || "unknown",
    requested_at: now,
    decided_at: null,
    decided_by: null,
    decision_reason: null,
  };
  requests.push(request);
  await writeRepoJson(
    REQUESTS_FILE,
    requests,
    sha,
    `Queue profile link change request for ${profileSlug}`
  );
  return { request, alreadyExisted: false };
}

export async function decideProfileLinkChangeRequest({
  requestId,
  action,
  moderatorId,
}) {
  const { requests, sha } = await listProfileLinkChangeRequests();
  const idx = requests.findIndex((r) => r && r.id === requestId);
  if (idx < 0) return { requests, target: null, sha: null };
  const target = requests[idx];
  if (target.status !== "pending") return { requests, target, sha };

  const at = new Date().toISOString();
  target.status = action === "approve_link_change" ? "approved" : "rejected";
  target.decided_at = at;
  target.decided_by = moderatorId || "unknown";
  target.decision_reason =
    action === "approve_link_change"
      ? "Approved by moderator"
      : "Rejected by moderator";

  await writeRepoJson(
    REQUESTS_FILE,
    requests,
    sha,
    `${target.status} profile link change request ${requestId}`
  );
  return { requests, target, sha };
}
