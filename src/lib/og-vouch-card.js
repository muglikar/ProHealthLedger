/** Utilities + JSX for vouch Open Graph cards (share previews). */

export function segmentToDisplayName(segment) {
  let s = decodeURIComponent(segment || "")
    .replace(/_/g, " ")
    .trim();
  if (!s) return "";
  if (!/\s/.test(s)) {
    s = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  }
  return s;
}

export function displayFromParam(raw, fallback) {
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
 * @param {string} cleanVoucher
 * @param {string} cleanVouchee
 * @returns {{ voucherText: string, voucheeText: string, nameSize: number }}
 */
export function formatVouchOgLines(cleanVoucher, cleanVouchee, rawMax = 100) {
  const v0 = (cleanVoucher || "").slice(0, rawMax);
  const u0 = (cleanVouchee || "").slice(0, rawMax);
  const DISPLAY_MAX = 56;
  const voucherText =
    v0.length > DISPLAY_MAX ? `${v0.slice(0, DISPLAY_MAX - 1)}...` : v0;
  const voucheeText =
    u0.length > DISPLAY_MAX ? `${u0.slice(0, DISPLAY_MAX - 1)}...` : u0;
  const longest = Math.max(voucherText.length, voucheeText.length);
  const nameSize = longest > 36 ? 48 : longest > 28 ? 60 : 72;
  return { voucherText, voucheeText, nameSize };
}

/**
 * Classic PHL vouch card. `scale` 2 => 2400x1260 output for sharper platform downscaling.
 */
export function VouchOgCardJsx({ voucherText, voucheeText, nameSize, scale }) {
  const px = (n) => `${n * scale}px`;
  const namePx = `${nameSize * scale}px`;

  return (
    <div
      style={{
        width: px(1200),
        height: px(630),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        backgroundImage:
          "linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #f1f5f9 100%)",
        padding: `${50 * scale}px ${60 * scale}px`,
        fontFamily: "Monda, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: px(50),
        }}
      >
        <div
          style={{
            width: px(56),
            height: px(56),
            borderRadius: px(14),
            backgroundColor: "#059669",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: px(22),
            fontWeight: 700,
            marginRight: px(20),
            boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
          }}
        >
          PHL
        </div>
        <div
          style={{
            display: "flex",
            fontSize: px(36),
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
          maxWidth: px(1050),
          textAlign: "center",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: namePx,
            fontWeight: 700,
            color: "#0f172a",
            lineHeight: 1.15,
            marginBottom: px(24),
          }}
        >
          {voucherText}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: namePx,
            fontWeight: 700,
            color: "#059669",
            fontStyle: "italic",
            marginBottom: px(24),
          }}
        >
          vouched for
        </div>
        <div
          style={{
            display: "flex",
            fontSize: namePx,
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
          borderTop: `${2 * scale}px solid #e2e8f0`,
          paddingTop: px(28),
          maxWidth: px(900),
          marginTop: px(40),
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: px(26),
            color: "#475569",
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Know who you're working with before you commit.
        </div>
      </div>
    </div>
  );
}
