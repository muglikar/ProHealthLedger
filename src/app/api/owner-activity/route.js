import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, readRepoJson, writeRepoJson } from "@/lib/github";
import { isSessionSiteAdmin } from "@/lib/site-admins";

const CURSOR_FILE = "data/owner_notification_cursor.json";

function maxIssueFromProfiles(profiles) {
  let max = 0;
  for (const p of profiles || []) {
    for (const s of p.submissions || []) {
      const n = Number(s.issue);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max;
}

function collectAfter(profiles, threshold) {
  const items = [];
  for (const p of profiles || []) {
    for (const s of p.submissions || []) {
      const n = Number(s.issue);
      if (!Number.isFinite(n) || n <= threshold) continue;
      items.push({
        profile_slug: p.slug,
        public_name: p.public_name,
        issue: n,
        vote: s.vote,
        user: s.user,
        display_name: s.display_name,
        date: s.date,
      });
    }
  }
  items.sort((a, b) => b.issue - a.issue);
  return items.slice(0, 40);
}

function normalizeCursor(raw) {
  if (!raw || typeof raw !== "object") {
    return { did_baseline: false, dismissed_max_issue: 0 };
  }
  return {
    did_baseline: Boolean(raw.did_baseline),
    dismissed_max_issue: Number(raw.dismissed_max_issue) || 0,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profiles } = await readDataFile("data/profiles/_index.json");
  const { data: rawCursor, sha: cursorSha } = await readRepoJson(CURSOR_FILE);
  const cursor = normalizeCursor(rawCursor);
  const maxRepo = maxIssueFromProfiles(profiles);

  if (!cursor.did_baseline) {
    const next = { did_baseline: true, dismissed_max_issue: maxRepo };
    try {
      await writeRepoJson(
        CURSOR_FILE,
        next,
        cursorSha,
        "Baseline owner activity notification cursor"
      );
    } catch {
      return Response.json(
        { error: "Could not update notification state." },
        { status: 500 }
      );
    }
    return Response.json({
      newCount: 0,
      items: [],
      dismissed_max_issue: maxRepo,
      max_issue_in_repo: maxRepo,
    });
  }

  const dismissed = cursor.dismissed_max_issue;
  const items = collectAfter(profiles, dismissed);
  return Response.json({
    newCount: items.length,
    items,
    dismissed_max_issue: dismissed,
    max_issue_in_repo: maxRepo,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profiles } = await readDataFile("data/profiles/_index.json");
  const maxRepo = maxIssueFromProfiles(profiles);
  const { sha: cursorSha } = await readRepoJson(CURSOR_FILE);
  const next = {
    did_baseline: true,
    dismissed_max_issue: maxRepo,
  };
  try {
    await writeRepoJson(
      CURSOR_FILE,
      next,
      cursorSha,
      "Owner dismissed activity notifications"
    );
  } catch {
    return Response.json({ error: "Could not save." }, { status: 500 });
  }
  return Response.json({
    success: true,
    dismissed_max_issue: maxRepo,
    newCount: 0,
    items: [],
    did_baseline: next.did_baseline,
  });
}
