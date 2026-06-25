export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/", // Protect APIs from normal crawling
      ],
    },
    // We can specifically allow the OG image API since it generates images that crawlers need to fetch
    // But usually crawlers fetch images directly.
    sitemap: "https://prohealthledger.org/sitemap.xml",
  };
}
