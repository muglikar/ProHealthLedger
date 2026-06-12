import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import { readDataFile } from "@/lib/github";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: profiles } = await readDataFile("data/profiles/_index.json").catch(() => ({ data: [] }));
    
    // Find profiles with placeholder images or no local image
    const missing = profiles.filter(
      (p) => 
        !p.profile_photo_url || 
        p.photo_storage === "placeholder" || 
        p.profile_photo_url.includes("placeholder")
    ).map(p => ({
      slug: p.slug,
      public_name: p.public_name,
      linkedin_url: p.linkedin_url,
      photo_storage: p.photo_storage,
      profile_photo_url: p.profile_photo_url
    }));

    return Response.json(missing);
  } catch (error) {
    console.error("[profiles-missing-images] error:", error);
    return Response.json({ error: "Failed to read profiles" }, { status: 500 });
  }
}
