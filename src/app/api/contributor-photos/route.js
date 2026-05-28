import { readDataFile } from "@/lib/github";
import { buildUnifiedPhotoMap } from "@/lib/photo-map";

export const dynamic = "force-dynamic";

/**
 * GET /api/contributor-photos
 *
 * Returns a unified map of all available photos across:
 * - contributors / users
 * - professionals / profiles
 *
 * This lets any page lookup a photo by userId, stripped ID, displayName, or LinkedIn vanity.
 */
export async function GET() {
  const { data: users } = await readDataFile("data/users/_index.json");
  const { data: profiles } = await readDataFile("data/profiles/_index.json");

  const photoMap = buildUnifiedPhotoMap(profiles || [], users || []);

  return Response.json(photoMap);
}

