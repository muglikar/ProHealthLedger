import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import { readDataFile, writeDataFile, getFileSha, deleteRepoFile } from "@/lib/github";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await req.json();

    if (!slug) {
      return Response.json({ error: "Slug is required." }, { status: 400 });
    }

    const { data: profiles, sha: profilesSha } = await readDataFile("data/profiles/_index.json");
    const profileIndex = profiles.findIndex((p) => p.slug === slug);

    if (profileIndex === -1) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const profile = profiles[profileIndex];
    const currentPhotoUrl = profile.profile_photo_url;

    // Check if the current photo is a local file
    if (currentPhotoUrl && currentPhotoUrl.startsWith("/") && !currentPhotoUrl.includes("placeholder")) {
      const fileName = currentPhotoUrl.slice(1);
      const filePath = `public/${fileName}`;

      // 1. Delete locally if in development
      if (process.env.NODE_ENV === "development") {
        try {
          const fs = require("fs");
          const path = require("path");
          const localPath = path.join(process.cwd(), "public", fileName);
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        } catch (err) {
          console.warn("[remove-profile-image] local delete failed:", err.message);
        }
      }

      // 2. Delete from GitHub repository
      try {
        const sha = await getFileSha(filePath);
        if (sha) {
          await deleteRepoFile(filePath, sha, `chore: delete local profile photo for ${slug}`);
        }
      } catch (err) {
        console.warn("[remove-profile-image] GitHub file delete failed:", err.message);
      }
    }

    // 3. Reset the photo properties in the profile entry
    profile.profile_photo_url = null;
    profile.photo_storage = "placeholder";
    profile.photo_verified = false;
    delete profile.photo_verified_by;
    delete profile.photo_verified_at;
    delete profile.resolution_source;
    delete profile.confidence;
    delete profile.resolved_at;

    // Save updated index file
    await writeDataFile(
      "data/profiles/_index.json",
      profiles,
      profilesSha,
      `chore: remove profile photo for ${slug}`
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("[remove-profile-image] error:", error);
    return Response.json({ error: error.message || "Failed to remove image" }, { status: 500 });
  }
}
