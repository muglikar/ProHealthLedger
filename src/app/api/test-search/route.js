export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") || "iantarakey";
  const query = `${slug} linkedin`;
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;

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
    const aRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let trace = [];

    while ((match = aRegex.exec(html)) !== null) {
      const rawHref = match[1];
      const rawText = match[2];
      
      let targetUrl = rawHref;
      const ruMatch = rawHref.match(/\/RU=([^/]+)/i);
      let ruVal = null;
      let decodedRu = null;

      if (ruMatch) {
        ruVal = ruMatch[1];
        try {
          decodedRu = decodeURIComponent(ruVal);
          targetUrl = decodedRu;
        } catch (e) {
          decodedRu = "error: " + e.message;
        }
      }

      const isTarget = targetUrl.toLowerCase().includes(`/in/${slug}`);
      if (rawHref.includes("linkedin.com") || rawText.toLowerCase().includes("linkedin")) {
        trace.push({
          rawHref,
          ruVal,
          decodedRu,
          targetUrl,
          isTarget,
          slug,
          text: rawText.replace(/<[^>]*>/g, "").trim().slice(0, 100)
        });
      }
    }

    return Response.json({
      slug,
      traceCount: trace.length,
      trace: trace.slice(0, 15)
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
