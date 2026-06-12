import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";
import { readDataFile, writeDataFile, writeRepoFile } from "@/lib/github";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  if (!isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug, imageData, fileName } = await req.json();

    if (!slug || !imageData) {
      return Response.json({ error: "Slug and image data are required." }, { status: 400 });
    }

    // Determine extension (default to jpeg)
    let ext = "jpeg";
    const mimeMatch = imageData.match(/^data:image\/(\w+);base64,/);
    if (mimeMatch) {
      ext = mimeMatch[1];
    }
    if (ext === "png") ext = "png";
    else ext = "jpeg"; // normalize to jpeg unless png

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const imageFileName = `${slug}.${ext}`;
    const filePath = `public/${imageFileName}`;

    // 1. Save locally if in development
    if (process.env.NODE_ENV === "development") {
      try {
        const fs = require("fs");
        const path = require("path");
        const localPath = path.join(process.cwd(), "public", imageFileName);
        fs.writeFileSync(localPath, buffer);
      } catch (err) {
        console.warn("[upload-profile-image] local write failed:", err.message);
      }
    }

    // 2. Commit image to GitHub
    await writeRepoFile(filePath, buffer, `chore: save local profile photo for ${slug}`);

    // 3. Update the profiles index
    const { data: profiles, sha: profilesSha } = await readDataFile("data/profiles/_index.json");
    const profileIndex = profiles.findIndex((p) => p.slug === slug);

    if (profileIndex !== -1) {
      profiles[profileIndex].profile_photo_url = `/${imageFileName}`;
      profiles[profileIndex].photo_storage = "local";
      profiles[profileIndex].resolution_source = "manual";
      profiles[profileIndex].confidence = 1.0;
      profiles[profileIndex].resolved_at = new Date().toISOString();

      await writeDataFile(
        "data/profiles/_index.json",
        profiles,
        profilesSha,
        `chore: update profile photo url for ${slug}`
      );
    }

    return Response.json({ success: true, url: `/${imageFileName}` });
  } catch (error) {
    console.error("[upload-profile-image] error:", error);
    return Response.json({ error: error.message || "Failed to upload image" }, { status: 500 });
  }
}
