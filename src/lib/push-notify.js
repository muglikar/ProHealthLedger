import webpush from "web-push";

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@prohealthledger.org",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

function getRepoConfig() {
  const isPrivate = !!process.env.GITHUB_REDACTIONS_REPO;
  return {
    owner: (isPrivate ? process.env.GITHUB_REDACTIONS_OWNER : null) || process.env.GITHUB_OWNER || "muglikar",
    repo: process.env.GITHUB_REDACTIONS_REPO || process.env.GITHUB_REPO || "ProHealthLedger",
    pat: (isPrivate ? process.env.GITHUB_REDACTIONS_PAT : null) || process.env.GITHUB_PAT || "",
  };
}

async function readWatchers(slug) {
  const { owner, repo, pat } = getRepoConfig();
  const filePath = `data/push-watchers/${slug}.json`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  
  const headers = { "Content-Type": "application/json" };
  if (pat) headers.Authorization = `Bearer ${pat}`;
  
  const res = await fetch(url, { headers, cache: "no-store" });
  if (res.status === 404) return { data: [], sha: null };
  if (!res.ok) return { data: [], sha: null };
  
  const json = await res.json();
  if (!json.content) return { data: [], sha: json.sha ?? null };
  
  const decoded = Buffer.from(json.content, "base64").toString("utf-8");
  try {
    const data = JSON.parse(decoded);
    return { data: Array.isArray(data) ? data : [], sha: json.sha };
  } catch {
    return { data: [], sha: json.sha };
  }
}

async function writeWatchers(slug, watchers, sha) {
  const { owner, repo, pat } = getRepoConfig();
  const filePath = `data/push-watchers/${slug}.json`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  
  const headers = { "Content-Type": "application/json" };
  if (pat) headers.Authorization = `Bearer ${pat}`;
  
  const encoded = Buffer.from(
    JSON.stringify(watchers, null, 2) + "\n"
  ).toString("base64");
  
  const payload = { 
    message: `Update watchers for profile ${slug} [skip ci]`, 
    content: encoded 
  };
  if (sha) payload.sha = sha;
  
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to write watchers: ${res.status} - ${err}`);
  }
}

export async function addWatcher(slug, subscription) {
  if (!subscription || !subscription.endpoint) return;
  const cleanSlug = slug.toLowerCase().trim();
  const { data: watchers, sha } = await readWatchers(cleanSlug);
  
  const exists = watchers.some(w => w.subscription?.endpoint === subscription.endpoint);
  if (exists) return;
  
  const newWatchers = [...watchers, { subscription, created_at: new Date().toISOString() }];
  await writeWatchers(cleanSlug, newWatchers, sha);
}

export async function removeWatcher(slug, endpoint) {
  if (!endpoint) return;
  const cleanSlug = slug.toLowerCase().trim();
  const { data: watchers, sha } = await readWatchers(cleanSlug);
  
  const newWatchers = watchers.filter(w => w.subscription?.endpoint !== endpoint);
  if (newWatchers.length === watchers.length) return;
  
  await writeWatchers(cleanSlug, newWatchers, sha);
}

export async function notifyProfileWatchers(slug, voteData) {
  const cleanSlug = slug.toLowerCase().trim();
  const { data: watchers, sha } = await readWatchers(cleanSlug);
  if (watchers.length === 0) return;
  
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.warn("VAPID keys not configured, skipping push notifications");
    return;
  }
  
  const payload = JSON.stringify({
    title: `Update on ${voteData.displayName}`,
    body: `Someone just submitted a ${voteData.vote === "yes" ? "vouch" : "flag"} for ${voteData.displayName}.`,
    icon: "/logo.png",
    url: `/profiles/${cleanSlug}`,
  });
  
  const failedEndpoints = [];
  
  await Promise.all(
    watchers.map(async (watcher) => {
      try {
        await webpush.sendNotification(watcher.subscription, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          failedEndpoints.push(watcher.subscription.endpoint);
        } else {
          console.error("Web Push delivery failed for watcher:", err);
        }
      }
    })
  );
  
  if (failedEndpoints.length > 0) {
    const activeWatchers = watchers.filter(w => !failedEndpoints.includes(w.subscription?.endpoint));
    await writeWatchers(cleanSlug, activeWatchers, sha).catch(err => {
      console.error("Failed to clean up expired watchers:", err);
    });
  }
}
