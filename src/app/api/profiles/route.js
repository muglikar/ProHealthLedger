import { readDataFile } from "@/lib/github";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasActiveViewCredit } from "@/lib/karma";

export const dynamic = "force-dynamic";

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  // Match common search engine crawlers, LLMs, scrapers, and agents
  const botRegex = /bot|googlebot|bingbot|gptbot|chatgpt|claudebot|perplexity|google-extended|applebot|yandex|baidu|crawl|spider|slurp|facebookexternalhit|meta-externalagent|oai-search/i;
  return botRegex.test(ua);
}

export async function GET(request) {
  const userAgent = request.headers.get("user-agent") || "";
  const { searchParams } = new URL(request.url);
  const authRequested = searchParams.get("auth") === "1";
  
  let hasCredit = isBot(userAgent);
  
  if (authRequested) {
    const session = await getServerSession(authOptions);
    if (session?.userId) {
      const { data: users } = await readDataFile("data/users/_index.json").catch(() => ({ data: [] }));
      const list = Array.isArray(users) ? users : [];
      let sessionUserId = (session.userId || "").replace("github:", "").replace("linkedin:", "");
      
      if (sessionUserId === "CAOSO1oig0") sessionUserId = "muglikar";

      const u = list.find((x) => {
        const uid = (x.user_id || x.github_username || "").replace("github:", "").replace("linkedin:", "");
        return uid === sessionUserId;
      });
      
      if (u) {
        const viewCredit = hasActiveViewCredit(u);
        if (viewCredit.active) {
          hasCredit = true;
        }
      }
    }
  }
  
  const { data } = await readDataFile("data/profiles/_index.json");
  const profiles = Array.isArray(data) ? data : [];
  
  if (hasCredit) {
    return Response.json(profiles);
  }
  
  // Strip reasons/comments for non-credited requests
  const strippedProfiles = profiles.map(profile => {
    if (!profile.submissions) return profile;
    
    return {
      ...profile,
      submissions: profile.submissions.map(sub => {
        const newSub = { ...sub };
        
        // If there was any comment text/reason (including pending or redacted), mark it locked
        const hasReasonText = !!(newSub.reason || newSub.reason_pending || newSub.reason_redacted);
        
        if (hasReasonText) {
          newSub.reason_locked = true;
        }
        
        delete newSub.reason;
        delete newSub.submitter_capacity;
        delete newSub.voted_capacity;
        
        return newSub;
      })
    };
  });
  
  return Response.json(strippedProfiles);
}
