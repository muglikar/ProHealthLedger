import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile, writeDataFile } from "@/lib/github";
import { isSessionSiteAdmin } from "@/lib/site-admins";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: profiles } = await readDataFile("data/profiles/_index.json");
  const pending = [];
  for (const p of profiles) {
    for (const s of p.submissions || []) {
      if (s.reason_pending) {
        pending.push({
          profile_slug: p.slug,
          public_name: p.public_name,
          issue: s.issue,
          user: s.user,
          display_name: s.display_name,
          vote: s.vote,
          reason: s.reason,
          date: s.date,
        });
      }
    }
  }
  return Response.json(pending);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId || !isSessionSiteAdmin(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { issue, action } = await req.json();
  if (!issue || !["approve", "reject"].includes(action)) {
    return Response.json(
      { error: "issue (number) and action (approve|reject) are required." },
      { status: 400 }
    );
  }

  const { data: profiles, sha } = await readDataFile(
    "data/profiles/_index.json"
  );

  let found = false;
  for (const p of profiles) {
    for (const s of p.submissions || []) {
      if (s.issue === issue && s.reason_pending) {
        found = true;
        if (action === "approve") {
          delete s.reason_pending;
        } else {
          delete s.reason;
          delete s.reason_pending;
        }
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    return Response.json(
      { error: "No pending submission found for that issue." },
      { status: 404 }
    );
  }

  await writeDataFile(
    "data/profiles/_index.json",
    profiles,
    sha,
    `Moderate comment on issue #${issue}: ${action}`
  );

  return Response.json({ success: true, action, issue });
}
