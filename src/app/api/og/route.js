import { ImageResponse } from "next/og";

export const runtime = "edge";

function displayFromParam(raw, fallback) {
  let s = typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
  try {
    s = decodeURIComponent(s);
  } catch {
    /* searchParams may already be decoded */
  }
  s = s.replace(/\+/g, " ").replace(/_/g, " ").trim() || fallback;
  if (!/\s/.test(s)) {
    s = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  }
  return s;
}

/**
 * Layout matches the pre-hardening OG card (gradient, 72px names, PRO-HEALTH LEDGER).
 * The original used a Unicode checkmark in the badge; Satori on Edge often emitted
 * empty PNGs for missing glyphs, so the badge shows bold "PHL" instead.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const rawMax = 100;
    const cleanVoucher = displayFromParam(
      searchParams.get("voucherName"),
      "A Colleague"
    ).slice(0, rawMax);
    const cleanVouchee = displayFromParam(
      searchParams.get("voucheeName"),
      "Professional"
    ).slice(0, rawMax);

    const DISPLAY_MAX = 56;
    const voucherText =
      cleanVoucher.length > DISPLAY_MAX
        ? `${cleanVoucher.slice(0, DISPLAY_MAX - 1)}...`
        : cleanVoucher;
    const voucheeText =
      cleanVouchee.length > DISPLAY_MAX
        ? `${cleanVouchee.slice(0, DISPLAY_MAX - 1)}...`
        : cleanVouchee;

    const longest = Math.max(voucherText.length, voucheeText.length);
    const nameSize = longest > 36 ? 48 : longest > 28 ? 60 : 72;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffffff",
            backgroundImage:
              "linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #f1f5f9 100%)",
            padding: "50px 60px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "50px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "22px",
                fontWeight: 700,
                marginRight: "20px",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
              }}
            >
              PHL
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "36px",
                fontWeight: 700,
                color: "#64748b",
                letterSpacing: "0.1em",
              }}
            >
              PRO-HEALTH LEDGER
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "1050px",
              textAlign: "center",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: nameSize,
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.15,
                marginBottom: "24px",
              }}
            >
              {voucherText}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: nameSize,
                fontWeight: 700,
                color: "#059669",
                fontStyle: "italic",
                marginBottom: "24px",
              }}
            >
              vouched for
            </div>
            <div
              style={{
                display: "flex",
                fontSize: nameSize,
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.15,
              }}
            >
              {voucheeText}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderTop: "2px solid #e2e8f0",
              paddingTop: "28px",
              maxWidth: "900px",
              marginTop: "40px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "26px",
                color: "#475569",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              Know who you're working with before you commit.
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cross-Origin-Resource-Policy": "cross-origin",
        },
      }
    );
  } catch (e) {
    console.error("OG image generation error:", e);
    return new Response("OG generation failed", { status: 500 });
  }
}
