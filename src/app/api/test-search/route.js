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
    let links = [];

    while ((match = aRegex.exec(html)) !== null) {
      links.push({
        href: match[1],
        text: match[2].replace(/<[^>]*>/g, "").trim().slice(0, 100)
      });
    }

    return Response.json({
      htmlLength: html.length,
      isCaptcha: html.includes("captcha") || html.includes("robot") || html.includes("verification"),
      links: links.slice(0, 30),
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
