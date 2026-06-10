export const dynamic = "force-dynamic";

export async function GET() {
  const query = "site:linkedin.com/in/iantarakey";
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

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
    
    // Find all indexes of "tarakey" (case-insensitive)
    const indexes = [];
    let pos = html.toLowerCase().indexOf("tarakey");
    while (pos !== -1) {
      indexes.push(pos);
      pos = html.toLowerCase().indexOf("tarakey", pos + 1);
    }

    const snippets = indexes.map((idx) => {
      return {
        index: idx,
        text: html.slice(Math.max(0, idx - 150), idx + 250)
      };
    });

    return Response.json({
      htmlLength: html.length,
      occurrencesCount: indexes.length,
      snippets,
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
