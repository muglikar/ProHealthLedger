import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readDataFile } from "@/lib/github";
import {
  VOUCHES_PER_FLAG,
  flagCreditsEarned,
  flagsAvailable,
  vouchesUntilNextCredit,
} from "@/lib/karma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: users } = await readDataFile("data/users/_index.json");
  const list = Array.isArray(users) ? users : [];
  const u = list.find((x) => x.user_id === session.userId);

  const yes_count = u?.yes_count ?? 0;
  const no_count = u?.no_count ?? 0;
  const available = flagsAvailable(u || {});
  const earned = flagCreditsEarned(yes_count);
  const until_next = vouchesUntilNextCredit(yes_count, no_count);

  return Response.json({
    yes_count,
    no_count,
    flags_available: available,
    credits_earned: earned,
    vouches_per_flag: VOUCHES_PER_FLAG,
    vouches_until_next_credit: until_next,
  });
}
