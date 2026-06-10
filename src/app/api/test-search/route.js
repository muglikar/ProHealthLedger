export const dynamic = "force-dynamic";

async function checkYahoo(query) {
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
    const indexes = [];
    let pos = html.toLowerCase().indexOf("tarakey");
    while (pos !== -1) {
      indexes.push(pos);
      pos = html.toLowerCase().indexOf("tarakey", pos + 1);
    }

    const snippets = indexes.map((idx) => {
      return {
        index: idx,
        text: html.slice(Math.max(0, idx - 100), idx + 200)
      };
    });

    return {
      query,
      status: res.status,
      occurrences: indexes.length,
      snippets,
    };
  } catch (err) {
    return { query, error: err.message };
  }
}

export async function GET() {
  const results = await Promise.all([
    checkYahoo("site:linkedin.com/in/iantarakey"),
    checkYahoo("iantarakey linkedin"),
    checkYahoo("Ian Tarakey Southbank"),
  ]);

  return Response.json({ results });
}
