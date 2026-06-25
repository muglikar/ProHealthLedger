import { readDataFile } from "@/lib/github";

const SITE_URL = "https://prohealthledger.org";

export default async function sitemap() {
  // 1. Core static routes
  const staticRoutes = [
    "",
    "/profiles",
    "/pro-directory",
    "/submit",
    "/contributors",
    "/transparency",
    "/reports",
    "/reports/tech-leadership-conduct-2026",
    "/privacy",
    "/terms",
    "/contact",
    "/data-rights",
    "/request-removal",
    "/refund-policy",
    "/referrals",
  ].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));

  // 2. Dynamic profile routes
  let dynamicRoutes = [];
  try {
    const res = await readDataFile("data/profiles/_index.json");
    if (Array.isArray(res.data)) {
      dynamicRoutes = res.data.map((profile) => {
        // Try to find the latest submission date to use as lastModified
        let lastMod = new Date();
        if (profile.submissions && profile.submissions.length > 0) {
          const dates = profile.submissions
            .map((s) => new Date(s.date || new Date()))
            .sort((a, b) => b - a);
          if (dates.length > 0) {
            lastMod = dates[0];
          }
        }

        const rawUrl = typeof profile.linkedin_url === "string" ? profile.linkedin_url : "";
        const urlSlug = rawUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] || profile.slug;

        return {
          url: `${SITE_URL}/profile/${encodeURIComponent(urlSlug)}`,
          lastModified: lastMod,
          changeFrequency: "weekly",
          priority: 0.9,
        };
      });
    }
  } catch (error) {
    console.error("Failed to generate sitemap profile routes:", error);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
