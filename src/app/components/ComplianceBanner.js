import Link from "next/link";

export default function ComplianceBanner() {
  const noticeText = "PHL is not a consumer report and must not be used for credit, insurance, housing, or employment eligibility decisions.";

  return (
    <aside className="compliance-banner">
      <div className="compliance-banner-content">
        <div className="compliance-marquee-wrapper">
          <div className="compliance-marquee-track">
            {/* Displaying notice multiple times to guarantee looping on wide screens */}
            <span>
              <strong>Compliance notice:</strong> {noticeText}
            </span>
            <span className="marquee-separator">|</span>
            <span>
              <strong>Compliance notice:</strong> {noticeText}
            </span>
            <span className="marquee-separator">|</span>
            <span>
              <strong>Compliance notice:</strong> {noticeText}
            </span>
          </div>
        </div>
        <div className="compliance-links">
          <Link href="/terms">Terms &amp; Conditions</Link>
          <span>·</span>
          <Link href="/privacy">Privacy</Link>
          <span>·</span>
          <Link href="/data-rights">Data Rights</Link>
        </div>
      </div>
    </aside>
  );
}

