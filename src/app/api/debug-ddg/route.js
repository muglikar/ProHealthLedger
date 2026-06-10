export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "iantarakey").trim();
  const query = `site:linkedin.com/in/${encodeURIComponent(slug)}`;
  const url = `https://html.duckduckgo.com/html/?q=${query}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });

    const status = res.status;
    if (!res.ok) {
      return Response.json({ status, error: "Failed to fetch DDG" });
    }

    const html = await res.text();
    
    // Look for match
    const ddgMatch = html.match(/class="result__a"[^>]*>([^<]+)\s*-.*LinkedIn/i) ||
                     html.match(/class="result__a"[^>]*>([^<]+)<\/a>/i);
    
    const matched = ddgMatch ? ddgMatch[0] : null;
    const nameGroup = ddgMatch ? ddgMatch[1] : null;

    // Check for rate limit / bot detection on DDG
    const isBotBlock = html.includes("ddg-captcha") || html.includes("robot") || html.includes("check your browser");

    return Response.json({
      status,
      isBotBlock,
      matched,
      nameGroup,
      htmlLength: html.length,
      htmlPreview: html.slice(0, 1000),
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
