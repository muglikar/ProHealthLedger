/** Load Monda WOFF2 binaries for @vercel/og ImageResponse (cached per runtime). */

let cachePromise = null;

async function fetchMondaFontData() {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Monda:wght@400;700&display=swap",
    {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }
  ).then((r) => r.text());

  const blocks = [...css.matchAll(/@font-face\s*\{[^}]+\}/g)].map((m) => m[0]);
  const urlByWeight = new Map();

  for (const block of blocks) {
    if (!/font-family:\s*['"]Monda['"]/.test(block)) continue;
    if (!/format\(['"]woff2['"]\)/.test(block)) continue;
    const w = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
    const url = /url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/.exec(block)?.[1];
    if (!Number.isFinite(w) || !url) continue;
    if (!urlByWeight.has(w)) urlByWeight.set(w, url);
  }

  const fonts = [];
  for (const weight of [400, 700]) {
    const url = urlByWeight.get(weight);
    if (!url) continue;
    const data = await fetch(url).then((r) => r.arrayBuffer());
    fonts.push({
      name: "Monda",
      data,
      style: "normal",
      weight,
    });
  }

  if (fonts.length < 1) {
    throw new Error("Could not load Monda fonts for OG image");
  }
  return fonts;
}

export function getMondaFontsForOg() {
  if (!cachePromise) {
    cachePromise = fetchMondaFontData();
  }
  return cachePromise;
}
