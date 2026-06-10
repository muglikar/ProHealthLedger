export const dynamic = "force-dynamic";

async function testUA(userAgent) {
  const url = "https://www.linkedin.com/in/iantarakey";
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });

    const status = res.status;
    const html = await res.text();
    
    // Extract title & og:image
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : null;

    const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i) ||
                    html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:image"/i);
    const ogImage = ogMatch ? ogMatch[1] : null;

    return {
      userAgent,
      status,
      title,
      ogImage,
      htmlLength: html.length,
      htmlPreview: html.slice(0, 500)
    };
  } catch (err) {
    return { userAgent, error: err.message };
  }
}

export async function GET() {
  const results = await Promise.all([
    testUA("LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)"),
    testUA("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"),
  ]);

  return Response.json({ results });
}
