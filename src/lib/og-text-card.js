import { ImageResponse } from "next/og";

/** No raster logos — avoids stale / distorted bitmaps in social caches. */
const COLORS = {
  pageBg: "#fafafa",
  text: "#1a1a1a",
  accent: "#b45309",
  navFg: "#0f172a",
};

const UA_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function fetchWoff2ArrayBuffer(weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Monda:wght@${weight}&display=swap`;
  const cssRes = await fetch(cssUrl, { headers: { "user-agent": UA_CHROME } });
  const css = await cssRes.text();

  let url =
    css.match(/src:\s*url\(([^)]+)\)\s*format\(\s*['"]?woff2['"]?\s*\)/i)?.[1] ||
    css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/i)?.[1];
  if (!url) return null;
  url = url.replace(/^['"]|['"]$/g, "").trim();

  const fontRes = await fetch(url, { headers: { "user-agent": UA_CHROME } });
  if (!fontRes.ok) return null;
  return fontRes.arrayBuffer();
}

async function mondaFonts() {
  try {
    const [data400, data700] = await Promise.all([
      fetchWoff2ArrayBuffer(400),
      fetchWoff2ArrayBuffer(700),
    ]);
    if (!data400 || !data700) return [];
    return [
      { name: "Monda", data: data400, style: "normal", weight: 400 },
      { name: "Monda", data: data700, style: "normal", weight: 700 },
    ];
  } catch {
    return [];
  }
}

/** 1200×630 PNG for `opengraph-image` / `twitter-image` (matches homepage hero tone). */
export async function textCardOgResponse() {
  const fonts = await mondaFonts();
  const fontStack =
    fonts.length > 0 ? "Monda" : "ui-sans-serif, system-ui, -apple-system, sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.pageBg,
          fontFamily: fontStack,
          padding: 56,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: COLORS.navFg,
            letterSpacing: "-0.02em",
            marginBottom: 28,
          }}
        >
          ProHealthLedger
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "baseline",
            maxWidth: "1020px",
            textAlign: "center",
            lineHeight: 1.16,
          }}
        >
          <span
            style={{
              fontSize: 50,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            {"Know who you're working with "}
          </span>
          <span
            style={{
              fontSize: 50,
              fontWeight: 700,
              fontStyle: "italic",
              color: COLORS.accent,
            }}
          >
            before you commit.
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts.length ? { fonts } : {}),
    }
  );
}
