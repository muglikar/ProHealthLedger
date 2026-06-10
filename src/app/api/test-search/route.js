export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "iantarakey linkedin";
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`;

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

    const html = await res.text();
    
    // We want to extract links that point to linkedin.com/in/
    // A Yahoo result link typically looks like:
    // <a class=" ac-algo fz-20 lh-24 text-d" href="...url..." ...>...text...</a>
    // Or just any <a> tag containing linkedin.com/in/
    const results = [];
    const aRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = aRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].replace(/<[^>]*>/g, "").trim();
      if (href.includes("linkedin.com/in/") || text.toLowerCase().includes("linkedin")) {
        results.push({ href, text });
      }
    }

    return Response.json({
      q,
      htmlLength: html.length,
      resultsCount: results.length,
      results: results.slice(0, 10),
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
