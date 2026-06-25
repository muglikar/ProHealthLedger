import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import { readRepoJson } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: logs } = await readRepoJson("data/system_logs.json").catch(() => ({ data: [] }));
    return Response.json(logs || []);
  } catch (error) {
    console.error("[system-logs] error:", error);
    return Response.json({ error: "Failed to read system logs" }, { status: 500 });
  }
}
