export const dynamic = "force-dynamic";

async function testFetch(url, name) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html",
      },
    });
    clearTimeout(timer);
    const text = await res.text();
    return {
      name,
      status: res.status,
      ok: res.ok,
      length: text.length,
      containsIan: text.toLowerCase().includes("ian"),
      containsTarakey: text.toLowerCase().includes("tarakey"),
      preview: text.slice(0, 400),
    };
  } catch (err) {
    clearTimeout(timer);
    return { name, error: err.message };
  }
}

export async function GET() {
  const query = "site:linkedin.com/in/iantarakey";
  const results = await Promise.all([
    testFetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, "DDG Lite"),
    testFetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, "DDG HTML"),
    testFetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, "Bing"),
    testFetch(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, "Yahoo"),
    testFetch(`https://www.ecosia.org/search?q=${encodeURIComponent(query)}`, "Ecosia"),
  ]);

  return Response.json({ results });
}
