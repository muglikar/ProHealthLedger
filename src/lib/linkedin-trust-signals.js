/**
 * Best-effort LinkedIn trust-signal fetcher used for anti-sybil onboarding.
 *
 * Requested policy requires:
 * - LinkedIn auth for first-time contributors
 * - account age >= 30 days
 * - connections >= 10
 *
 * LinkedIn APIs expose these fields inconsistently across products/entitlements.
 * We attempt the common endpoints and normalize whatever is available.
 */

function parseMemberSinceDays(payload) {
  // Common guess fields observed across LinkedIn payload variants.
  const candidates = [
    payload?.memberSince,
    payload?.createdAt,
    payload?.created_at,
    payload?.basicInfo?.memberSince,
    payload?.basicInfo?.createdAt,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const t = Date.parse(String(value));
    if (!Number.isFinite(t)) continue;
    const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
    if (Number.isFinite(days) && days >= 0) return days;
  }
  return null;
}

function parseConnections(payload) {
  const candidates = [
    payload?.connectionsCount,
    payload?.connectionCount,
    payload?.connections,
    payload?.basicInfo?.connectionsCount,
    payload?.firstDegreeSize,
    payload?.elements?.[0]?.firstDegreeSize,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return null;
}

async function fetchJson(url, accessToken, linkedInVersion = "202604") {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": linkedInVersion,
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchLinkedinTrustSignals(accessToken, linkedinSub) {
  if (!accessToken) {
    return { accountAgeDays: null, connections: null, source: "missing-token" };
  }

  // identityMe works on more apps than network APIs, so try it first.
  const identityMe = await fetchJson(
    "https://api.linkedin.com/rest/identityMe",
    accessToken,
    "202604"
  );
  let accountAgeDays = parseMemberSinceDays(identityMe);
  let connections = parseConnections(identityMe);

  // Best-effort connection count endpoint (may require extra product access).
  if (connections == null && linkedinSub) {
    const network = await fetchJson(
      `https://api.linkedin.com/v2/networkSizes/urn:li:person:${encodeURIComponent(
        linkedinSub
      )}?edgeType=MemberToMember`,
      accessToken
    );
    connections = parseConnections(network);
  }

  return {
    accountAgeDays,
    connections,
    source: "linkedin-api",
  };
}

