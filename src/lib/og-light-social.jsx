import { ImageResponse } from "next/og";

const SITE_URL = "https://pro-health-ledger.vercel.app";

/** Mirrors `globals.css` :root + `.nav` + homepage hero. */
const COLORS = {
  pageBg: "#fafafa",
  navBg: "#ffffff",
  navBorder: "#cbd5e1",
  navFg: "#0f172a",
  text: "#1a1a1a",
  textSecondary: "#555555",
  accent: "#b45309",
  accentBg: "rgba(180, 83, 9, 0.07)",
  border: "#e8e0d4",
  muted: "#888888",
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

/**
 * Social preview: same brand strip as the nav (logo + ProHealthLedger) + homepage hero.
 * All sans-serif (Monda); no faux-italic (Satori would look “serif” otherwise).
 */
export async function lightSocialImageResponse() {
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
          alignItems: "stretch",
          background: COLORS.pageBg,
          fontFamily: fontStack,
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "16px 32px",
            background: COLORS.navBg,
            borderBottom: `2px solid ${COLORS.navBorder}`,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <img
              src={`${SITE_URL}/logo.png`}
              width={40}
              height={40}
              alt=""
              style={{ objectFit: "contain" }}
            />
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.navFg,
              letterSpacing: "-0.02em",
            }}
          >
            ProHealthLedger
          </span>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "28px 56px 36px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "7px 18px",
              borderRadius: "9999px",
              background: COLORS.accentBg,
              color: COLORS.accent,
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.03em",
            }}
          >
            Free · Public · Permanent
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              maxWidth: "1000px",
              lineHeight: 1.14,
            }}
          >
            <span
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              Know who you&apos;re working with{" "}
            </span>
            <span
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: COLORS.accent,
              }}
            >
              before you commit.
            </span>
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 21,
              fontWeight: 400,
              color: COLORS.textSecondary,
              lineHeight: 1.45,
              maxWidth: "880px",
            }}
          >
            <span>One question: </span>
            <span style={{ fontWeight: 700, color: COLORS.text }}>
              &ldquo;Would you work with them again?&rdquo;
            </span>
            <span style={{ display: "block", marginTop: "6px" }}>
              Public ledger — no star ratings, no long reviews.
            </span>
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 17,
              fontWeight: 400,
              color: COLORS.textSecondary,
              lineHeight: 1.35,
              maxWidth: "880px",
              opacity: 0.95,
            }}
          >
            GitHub or LinkedIn sign-in · Full transparency page · One voice per
            person, per professional — no duplicates
          </div>

          <div
            style={{
              marginTop: 22,
              width: "100%",
              maxWidth: "640px",
              height: 1,
              background: COLORS.border,
            }}
          />

          <div
            style={{
              marginTop: 14,
              fontSize: 17,
              fontWeight: 600,
              color: COLORS.textSecondary,
            }}
          >
            Professional Health Ledger
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 15,
              fontWeight: 500,
              color: COLORS.muted,
            }}
          >
            pro-health-ledger.vercel.app
          </div>
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
