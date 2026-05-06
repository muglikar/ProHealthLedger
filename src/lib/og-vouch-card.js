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

const OG_W = 1200;
const OG_H = 627; // LinkedIn recommends 1.91:1 → 1200×627

/**
 * Classic PHL vouch card with Monda font.
 * Names use Monda Regular (weight 400), "vouched for" uses Monda Italic.
 */
export function VouchOgCardJsx({ voucherText, voucheeText, nameSize, scale }) {
  const px = (n) => `${n * scale}px`;
  const namePx = `${nameSize * scale}px`;

  return (
    <div
      style={{
        width: px(OG_W),
        height: px(OG_H),
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
      {/* Top: PHL Logo + Branding */}
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

      {/* Center: [Voucher] vouched for [Vouchee] */}
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
        {/* Voucher Name — Monda Regular */}
        <div
          style={{
            display: "flex",
            fontSize: namePx,
            fontWeight: 400,
            color: "#0f172a",
            lineHeight: 1.15,
            marginBottom: px(24),
          }}
        >
          {voucherText}
        </div>
        {/* "vouched for" — Monda Italic */}
        <div
          style={{
            display: "flex",
            fontSize: namePx,
            fontWeight: 400,
            color: "#059669",
            fontStyle: "italic",
            marginBottom: px(24),
          }}
        >
          vouched for
        </div>
        {/* Vouchee Name — Monda Regular */}
        <div
          style={{
            display: "flex",
            fontSize: namePx,
            fontWeight: 400,
            color: "#0f172a",
            lineHeight: 1.15,
          }}
        >
          {voucheeText}
        </div>
      </div>

      {/* Bottom: Tagline */}
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
            fontWeight: 400,
            textAlign: "center",
          }}
        >
          Know who you're working with before you commit.
        </div>
      </div>
    </div>
  );
}


export function GeneralOgCardJsx({ scale }) {
  const px = (n) => `${n * scale}px`;

  return (
    <div
      style={{
        width: px(OG_W),
        height: px(OG_H),
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        padding: `${50 * scale}px ${60 * scale}px`,
        fontFamily: "Monda, sans-serif",
      }}
    >
      {/* Left: Large Heart Emblem */}
      <div style={{ display: "flex", marginRight: px(60) }}>
        <img
          src="https://prohealthledger.org/logo.png"
          width={px(380)}
          height={px(380)}
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Right: Stacked Text Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: px(68),
            fontWeight: 700,
            color: "#334155", // Slate charcoal
            marginBottom: px(10),
            letterSpacing: "-0.02em",
          }}
        >
          Know who you're working with
        </div>
        <div
          style={{
            display: "flex",
            fontSize: px(82),
            fontWeight: 700,
            color: "#b45309", // Premium Orange
            fontStyle: "italic",
            marginBottom: px(50),
          }}
        >
          before you commit!
        </div>
        <div
          style={{
            display: "flex",
            fontSize: px(64),
            color: "#334155",
            fontWeight: 400,
            textDecoration: "underline",
          }}
        >
          ProHealthLedger.org
        </div>
      </div>
    </div>
  );
}
