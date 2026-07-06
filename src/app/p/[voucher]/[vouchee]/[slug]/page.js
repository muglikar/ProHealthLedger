import ProfilesClient from "@/app/profiles/ProfilesClient";
import { buildVouchOgUrl } from "@/lib/og-vouch-url";
import {
  VOUCH_OG_HEIGHT,
  VOUCH_OG_WIDTH,
} from "@/lib/create-vouch-og-image-response";
import { segmentToDisplayName } from "@/lib/og-vouch-card";
import { Suspense } from "react";
import { readDataFile } from "@/lib/github";

/** Crawlers must see the production host on og:image. */
const CANONICAL_ORIGIN = "https://prohealthledger.org";

function VouchSsrFallback({ cleanVoucher, cleanVouchee, submission }) {
  const voteLabel = submission?.vote === "yes" ? "✓ Yes" : "✗ No";
  const isLocked = submission?.reason_locked || false;
  const isPending = submission?.reason_pending || false;
  const isRedacted = submission?.reason_redacted || false;

  return (
    <div className="vouch-ssr-fallback-wrapper">
      <div className="page-header">
        <h1>Vouch Details</h1>
        <p className="submit-hero-sub">
          <a href="/">What the heck is this?</a>
        </p>
      </div>

      <div
        className="comment-read-modal-details"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginTop: "20px" }}
      >
        <h2 style={{ fontSize: "1.3rem", marginTop: 0, marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          {cleanVoucher} {submission?.vote === "no" ? "flagged" : "vouched for"} {cleanVouchee}
        </h2>

        {submission?.voted_capacity && (
          <div className="comment-read-modal-row">
            <span className="comment-read-modal-k">Their Role & Org</span>
            <span className="comment-read-modal-v">{submission.voted_capacity}</span>
          </div>
        )}
        <div className="comment-read-modal-row">
          <span className="comment-read-modal-k">Would work with again?</span>
          <span className="comment-read-modal-v">
            <span className={`vote-pill ${submission?.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}>
              {voteLabel}
            </span>
          </span>
        </div>
        <div className="comment-read-modal-row">
          <span className="comment-read-modal-k">Submitted by</span>
          <span className="comment-read-modal-v">{cleanVoucher}</span>
        </div>
        {submission?.submitter_capacity && (
          <div className="comment-read-modal-row">
            <span className="comment-read-modal-k">Voter&apos;s Role & Org</span>
            <span className="comment-read-modal-v">{submission.submitter_capacity}</span>
          </div>
        )}
        <div className="comment-read-modal-row">
          <span className="comment-read-modal-k">Date</span>
          <span className="comment-read-modal-v">{submission?.date || "—"}</span>
        </div>
        <div className="comment-read-modal-row">
          <span className="comment-read-modal-k">Record</span>
          <span className="comment-read-modal-v">
            {submission?.issue != null ? (
              <a href={`https://github.com/muglikar/ProHealthLedger/issues/${submission.issue}`} target="_blank" rel="noopener noreferrer" className="issue-link">
                #{submission.issue}
              </a>
            ) : "—"}
          </span>
        </div>

        <div className="comment-read-modal-comment-section" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
          <h4 className="comment-read-modal-comment-heading" style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Comment</h4>
          <div className="comment-read-modal-body" style={{ background: "var(--bg-body)", padding: "12px", borderRadius: "8px", fontSize: "0.95rem", lineHeight: "1.5" }}>
            {isLocked ? (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <span style={{ fontSize: "1.2rem", display: "block", marginBottom: 4 }} aria-hidden="true">🔒</span>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Comments and roles are locked.</p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>
                  <a href="/submit" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>Sign in & vouch to unlock &rarr;</a>
                </p>
              </div>
            ) : isPending ? (
              <span className="audit-comment-pending">Pending review</span>
            ) : isRedacted ? (
              <span className="audit-comment-redacted" title={`Redacted by moderator on ${submission?.redacted_at?.slice(0, 10) || "unknown date"} — category: ${submission?.redaction_category || "miscellaneous"}.`}>
                [redacted by moderator on {submission?.redacted_at?.slice(0, 10) || "unknown date"} &mdash; {submission?.redaction_category || "miscellaneous"}]
              </span>
            ) : (
              submission?.reason || submission?.comment || "—"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** `og:image` → `/api/og?voucherName=&voucheeName=` (simple HTTPS URL; LinkedIn often handles this better than dynamic path segments). */

export async function generateMetadata({ params }) {
  const resolvedParams = await params; // Mandatory in Next.js 15+
  try {
    const cleanVoucher = segmentToDisplayName(resolvedParams?.voucher);
    const cleanVouchee = segmentToDisplayName(resolvedParams?.vouchee);
    const ogUrl = buildVouchOgUrl(CANONICAL_ORIGIN, cleanVoucher, cleanVouchee);
    const pageUrl = `${CANONICAL_ORIGIN}/p/${encodeURIComponent(
      resolvedParams?.voucher || ""
    )}/${encodeURIComponent(resolvedParams?.vouchee || "")}/${encodeURIComponent(
      resolvedParams?.slug || ""
    )}`;
    const title = `${cleanVoucher} vouched for ${cleanVouchee} - Professional Conduct, Behavior & Human Reviews | ProHealthLedger`;
    const description = `View the verified professional conduct review and human vouch for ${cleanVouchee} by ${cleanVoucher} on ProHealthLedger.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        url: pageUrl,
        siteName: "Professional Health Ledger",
        images: [
          {
            url: ogUrl,
            secureUrl: ogUrl,
            width: VOUCH_OG_WIDTH,
            height: VOUCH_OG_HEIGHT,
            type: "image/png",
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogUrl],
      },
    };
  } catch (e) {
    return { title: "Verified Vouch | ProHealthLedger" };
  }
}

export default async function VouchPage({ params }) {
  const resolvedParams = await params;
  const cleanVouchee = segmentToDisplayName(resolvedParams?.vouchee);
  const cleanVoucher = segmentToDisplayName(resolvedParams?.voucher);
  
  let profiles = [];
  try {
    const res = await readDataFile("data/profiles/_index.json");
    if (Array.isArray(res.data)) profiles = res.data;
  } catch (e) {}

  const profile = profiles.find((p) => p.slug === resolvedParams?.slug);
  const submission = profile?.submissions?.find((s) => {
    const submitterName = s.display_name || s.user || "";
    return segmentToDisplayName(submitterName).toLowerCase() === cleanVoucher.toLowerCase() ||
           submitterName.toLowerCase() === cleanVoucher.toLowerCase();
  });

  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": cleanVouchee,
    "description": `Professional profile and verified human conduct reviews for ${cleanVouchee}`,
    "review": {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": cleanVoucher
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5"
      },
      "reviewBody": submission?.reason || submission?.comment || "Verified professional vouch for conduct and behavior."
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />
      <Suspense
        fallback={
          <VouchSsrFallback
            cleanVoucher={cleanVoucher}
            cleanVouchee={cleanVouchee}
            submission={submission}
          />
        }
      >
        <ProfilesClient initialSearch={resolvedParams?.slug} initialProfiles={profiles} />
      </Suspense>
    </>
  );
}
