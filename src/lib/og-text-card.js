import { ImageResponse } from "next/og";

/**
 * Text-only 1200×630 card — no remote fetches (Edge was returning 0-byte PNGs on Vercel;
 * crawlers then fell back to favicon / logo.png = old “green heart” preview).
 */
const COLORS = {
  pageBg: "#fafafa",
  text: "#1a1a1a",
  accent: "#b45309",
  navFg: "#0f172a",
};

const FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** 1200×630 PNG for `opengraph-image` / `twitter-image`. */
export function textCardOgResponse() {
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
          fontFamily: FONT,
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
    }
  );
}
