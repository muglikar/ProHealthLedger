export const dynamic = "force-dynamic";

function extractNameFromTitle(raw) {
  if (!raw || typeof raw !== "string") return null;

  let s = raw.trim();
  s = s.replace(/^\(\d+\)\s*/, "");
  s = s.replace(/\s*\|\s*LinkedIn\s*$/i, "");

  const firstSegment = s.split(/\s+-\s+/)[0].trim();

  if (!firstSegment) return null;
  if (firstSegment.length < 2) return null;
  if (/linkedin\.com/i.test(firstSegment)) return null;
  if (/^linkedin$/i.test(firstSegment)) return null;

  const decoded = firstSegment
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );

  return decoded.trim() || null;
}

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
    let name = null;
    let rawMatches = [];

    while ((match = aRegex.exec(html)) !== null) {
      const rawHref = match[1];
      const rawText = match[2];
      
      let targetUrl = rawHref;
      const ruMatch = rawHref.match(/[?&]RU=([^&]+)/i);
      if (ruMatch) {
        try {
          targetUrl = decodeURIComponent(ruMatch[1]);
        } catch {}
      }

      const isTargetProfile = targetUrl.toLowerCase().includes(`/in/${slug}`);
      if (isTargetProfile) {
        let text = rawText.replace(/<[^>]*>/g, "").trim();
        const cleanedText1 = text.replace(/^LinkedInhttps?:\/\/[^\s]+(\s+›\s+[^\s]+)*/i, "").trim();
        const cleanedText2 = cleanedText1.replace(/^https?:\/\/[^\s]+(\s+›\s+[^\s]+)*/i, "").trim();
        name = extractNameFromTitle(cleanedText2);
        
        rawMatches.push({
          rawHref,
          targetUrl,
          text,
          cleanedText1,
          cleanedText2,
          extractedName: name
        });
      }
    }

    return Response.json({
      slug,
      query,
      resultsFound: rawMatches.length,
      resolvedName: name,
      matches: rawMatches,
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
