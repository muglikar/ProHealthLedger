import { readDataFile } from "@/lib/github";

/**
 * GET /api/contributor-photos
 *
 * Returns a map of user_id → image URL for all contributors who have a photo.
 * Also indexes by display_name (lowercased) for fuzzy matching.
 * This lets any page show contributor avatars next to their votes.
 */
export async function GET() {
  const { data } = await readDataFile("data/users/_index.json");
  if (!Array.isArray(data)) {
    return Response.json({});
  }

  const photoMap = {};

  for (const user of data) {
    if (!user || !user.image) continue;

    // Index by user_id
    if (user.user_id) {
      photoMap[user.user_id] = user.image;
      // Also strip prefixes for easier matching
      const stripped = user.user_id
        .replace("github:", "")
        .replace("linkedin:", "");
      photoMap[stripped] = user.image;
    }

    // Index by display_name (lowercased) for fuzzy matching
    if (user.display_name) {
      photoMap[user.display_name.trim().toLowerCase()] = user.image;
    }
  }

  return Response.json(photoMap);
}
