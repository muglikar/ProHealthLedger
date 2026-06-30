"use client";

import ProfilePhoto from "@/app/components/ProfilePhoto";

/**
 * Client component for the sponsor table rows.
 * Needed so the interactive ProfilePhoto component (with flag checkbox) works.
 */
export default function SponsorRow({ sponsor, profileMatch, index }) {
  const linkedinUrl =
    profileMatch?.linkedin_url ||
    (sponsor.name === "Anand Muglikar"
      ? "https://www.linkedin.com/in/muglikar"
      : null);

  const slug = linkedinUrl
    ? (linkedinUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] || null)
    : null;

  const phlProfileUrl = slug 
    ? `/profile/${slug.toLowerCase()}` 
    : `/profiles?search=${encodeURIComponent(sponsor.name || "")}`;

  return (
    <tr style={{ background: index % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
      <td
        style={{
          padding: "16px",
          borderTopLeftRadius: "12px",
          borderBottomLeftRadius: "12px",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ fontWeight: "600" }}>
          {new Date(sponsor.timestamp).toLocaleDateString()}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          {new Date(sponsor.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </td>
      <td
        style={{
          padding: "16px",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <ProfilePhoto
            photoUrl={profileMatch?.profile_photo_url || null}
            name={sponsor.name || "Sponsor"}
            slug={slug}
            size={40}
          />
          <div>
            <div style={{ fontWeight: "700", fontSize: "1rem" }}>
              <a
                href={phlProfileUrl}
                style={{
                  color: "#2563eb",
                  textDecoration: "none",
                  borderBottom: "1px dashed #2563eb",
                }}
              >
                {sponsor.name}
              </a>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              {sponsor.email}
            </div>
            {sponsor.mobile && (
              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                {sponsor.mobile}
              </div>
            )}
          </div>
        </div>
      </td>
      <td
        style={{
          padding: "16px",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ fontWeight: "600" }}>
          {sponsor.org || sponsor.organization || "Individual"}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
          {sponsor.country}
        </div>
      </td>
      <td
        style={{
          padding: "16px",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: "20px",
            background: "#fff7ed",
            color: "#9a3412",
            fontSize: "0.75rem",
            fontWeight: "700",
            textTransform: "uppercase",
          }}
        >
          {sponsor.tier}
        </span>
      </td>
      <td
        style={{
          padding: "16px",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ fontWeight: "800", color: "#059669", fontSize: "1rem" }}>
          {sponsor.currency} {sponsor.amount}
        </div>
      </td>
      <td
        style={{
          padding: "16px",
          borderTopRightRadius: "12px",
          borderBottomRightRadius: "12px",
          borderTop: "1px solid #f1f5f9",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          ID:{" "}
          <span style={{ fontFamily: "monospace" }}>
            {sponsor.razorpay_payment_id}
          </span>
        </div>
        {sponsor.razorpay_order_id && (
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            Order:{" "}
            <span style={{ fontFamily: "monospace" }}>
              {sponsor.razorpay_order_id}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
}
