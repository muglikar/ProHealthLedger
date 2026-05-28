import { readDataFile } from "@/lib/github";
import { buildUnifiedPhotoMap, lookupPhoto } from "@/lib/photo-map";

export async function GET() {
  const { data: users } = await readDataFile("data/users/_index.json");
  const { data: profiles } = await readDataFile("data/profiles/_index.json");

  if (!Array.isArray(users)) {
    return Response.json([]);
  }

  const photoMap = buildUnifiedPhotoMap(profiles || [], users);
  const mergedMap = new Map();

  for (const user of users) {
    if (!user) continue;
    const canonicalName = (user.display_name || user.user_id || "").trim().toLowerCase();
    if (!canonicalName) continue;

    if (mergedMap.has(canonicalName)) {
      const existing = mergedMap.get(canonicalName);
      
      // Merge fields
      existing.display_name = user.display_name || existing.display_name;
      existing.email = user.email || existing.email;
      existing.image = user.image || existing.image;
      existing.linkedin_url = user.linkedin_url || existing.linkedin_url;
      
      // Combine contributions
      const existingContribs = existing.contributions || [];
      const newContribs = user.contributions || [];
      const combinedContribs = [...existingContribs, ...newContribs];
      
      // De-duplicate contributions by profile_slug
      const uniqueContribs = [];
      const seenSlugs = new Set();
      for (const c of combinedContribs) {
        if (!c.profile_slug) continue;
        if (!seenSlugs.has(c.profile_slug)) {
          seenSlugs.add(c.profile_slug);
          uniqueContribs.push(c);
        }
      }
      existing.contributions = uniqueContribs;

      // Recalculate counts based on unique contributions
      existing.yes_count = uniqueContribs.filter(c => c.vote === "yes").length;
      existing.no_count = uniqueContribs.filter(c => c.vote === "no").length;

      // Handle user_ids: if one is LinkedIn ID and the other is GitHub username,
      // store github_username and set main user_id to the LinkedIn one
      if (user.user_id) {
        const isUserLinkedIn = user.user_id.length > 8 && !user.user_id.includes(":");
        if (isUserLinkedIn) {
          existing.github_username = existing.github_username || existing.user_id;
          existing.user_id = `linkedin:${user.user_id}`;
        } else {
          existing.github_username = user.user_id;
        }
      }
    } else {
      // Deep copy user
      const copy = { ...user };
      if (copy.user_id && copy.user_id.length > 8 && !copy.user_id.includes(":")) {
        copy.user_id = `linkedin:${copy.user_id}`;
      }
      
      // Recalculate counts based on contributions to be safe and precise
      const contribs = copy.contributions || [];
      copy.yes_count = contribs.filter(c => c.vote === "yes").length;
      copy.no_count = contribs.filter(c => c.vote === "no").length;

      mergedMap.set(canonicalName, copy);
    }
  }

  // Enrich each contributor with their resolved photo from the unified photo map if missing
  const contributorsList = Array.from(mergedMap.values());
  for (const c of contributorsList) {
    const userId = c.user_id || (c.github_username ? `github:${c.github_username}` : null);
    c.image = c.image || lookupPhoto(photoMap, {
      userId,
      displayName: c.display_name,
      linkedinUrl: c.linkedin_url
    });
  }

  return Response.json(contributorsList);
}
