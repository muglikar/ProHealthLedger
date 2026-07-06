import { Suspense } from "react";
import ProfilesClient from "@/app/profiles/ProfilesClient";
import { readDataFile } from "@/lib/github";
import { formatProfessionalDisplayName } from "@/lib/profiles";
import { buildVouchOgUrl } from "@/lib/og-vouch-url";

const CANONICAL_ORIGIN = "https://prohealthledger.org";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";

  let profiles = [];
  try {
    const res = await readDataFile("data/profiles/_index.json");
    if (Array.isArray(res.data)) profiles = res.data;
  } catch (e) {
    // Ignore error
  }

  const profile = profiles.find((p) => p.slug === slug);
  const publicName = formatProfessionalDisplayName(slug, profile?.public_name);
  const titleName = publicName || "Verified Professional";

  const title = `${titleName} - Professional Profile & Conduct Reviews | ProHealthLedger`;
  const description = `View the professional profile, conduct reviews, and community vouches for ${titleName} on ProHealthLedger.`;

  // We reuse the verified badge logic for the OG Image if possible, or a general one
  // For simplicity, we can use the vouch-og but with directory/directory if we want, or better, 
  // point to the verified badge API if one exists.
  // The current app uses buildVouchOgUrl which requires voucher and vouchee. 
  // We can just use "ProHealthLedger" as voucher, or generic OG.
  const ogUrl = buildVouchOgUrl(CANONICAL_ORIGIN, "ProHealthLedger Community", titleName);
  const pageUrl = `${CANONICAL_ORIGIN}/profile/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      type: "profile",
      url: pageUrl,
      siteName: "Professional Health Ledger",
      images: [
        {
          url: ogUrl,
          secureUrl: ogUrl,
          width: 1200,
          height: 627,
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
}

function ProfileSsrFallback({ profile, slug, titleName, vouches, flags }) {
  const totalVotes = vouches + flags;
  const submissions = profile?.submissions ? [...profile.submissions] : [];

  const initials = (titleName || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  const showPhoto = profile?.profile_photo_url;

  return (
    <div className="profile-ssr-fallback-wrapper">
      <div className="page-header">
        <h1>Votes</h1>
        <p className="submit-hero-sub">
          <a href="/">What the heck is this?</a>
        </p>
      </div>

      {!profile ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No votes match that search</h3>
          <p>
            This profile isn&apos;t on the ledger yet. Be the first to{" "}
            <a href={`/submit?linkedin=${encodeURIComponent("https://www.linkedin.com/in/" + slug)}`} style={{ color: "var(--accent)", textDecoration: "underline" }}>
              vouch
            </a>{" "}
            &mdash; or watch for updates.
          </p>
        </div>
      ) : (
        <>
          <div className="votes-profile-panel">
            <div className="votes-profile-panel-header" style={{ alignItems: "flex-start", display: "flex", gap: "20px" }}>
              <div className="pphoto-wrapper">
                {showPhoto ? (
                  <img
                    src={profile.profile_photo_url}
                    alt={titleName}
                    className="pphoto-img"
                    style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <span
                    className="pphoto-img pphoto-initials"
                    style={{ width: 84, height: 84, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--border)", color: "var(--text-secondary)", fontSize: 84 * 0.38, fontWeight: "bold" }}
                  >
                    {initials}
                  </span>
                )}
              </div>
              <div className="votes-profile-panel-info">
                <h2 className="votes-profile-panel-name" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", margin: "0 0 8px 0" }}>
                  {titleName}
                </h2>
                <div className="votes-profile-panel-link" style={{ color: "var(--text-secondary)", cursor: "not-allowed", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.9rem" }}>
                  <span>🔒</span> LinkedIn profile locked
                </div>
                <div className="vote-counts" style={{ margin: "8px 0 4px", display: "flex", gap: "8px" }}>
                  <span className="vote-badge vote-yes">✓ {vouches} would work with again</span>
                  <span className="vote-badge vote-no">✗ {flags} would not work with them again</span>
                </div>
                <div className="submission-count" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                  {totalVotes} vote{totalVotes !== 1 ? "s" : ""} from the community
                </div>
              </div>
            </div>
          </div>

          <div className="votes-cards-container" style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "16px" }}>
            {submissions.map((sub, idx) => {
              const voteLabel = sub.vote === "yes" ? "✓ Yes" : "✗ No";
              const voterName = sub.display_name || sub.user || "Verified Professional";
              const isLocked = sub.reason_locked || false;
              const isPending = sub.reason_pending || false;
              const isRedacted = sub.reason_redacted || false;

              return (
                <div
                  key={idx}
                  className="comment-read-modal-details"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                >
                  {sub.voted_capacity && (
                    <div className="comment-read-modal-row">
                      <span className="comment-read-modal-k">Their Role & Org</span>
                      <span className="comment-read-modal-v">{sub.voted_capacity}</span>
                    </div>
                  )}
                  <div className="comment-read-modal-row">
                    <span className="comment-read-modal-k">Would work with again?</span>
                    <span className="comment-read-modal-v">
                      <span className={`vote-pill ${sub.vote === "yes" ? "vote-pill-yes" : "vote-pill-no"}`}>
                        {voteLabel}
                      </span>
                    </span>
                  </div>
                  <div className="comment-read-modal-row">
                    <span className="comment-read-modal-k">Submitted by</span>
                    <span className="comment-read-modal-v">{voterName}</span>
                  </div>
                  {sub.submitter_capacity && (
                    <div className="comment-read-modal-row">
                      <span className="comment-read-modal-k">Voter&apos;s Role & Org</span>
                      <span className="comment-read-modal-v">{sub.submitter_capacity}</span>
                    </div>
                  )}
                  <div className="comment-read-modal-row">
                    <span className="comment-read-modal-k">Date</span>
                    <span className="comment-read-modal-v">{sub.date || "—"}</span>
                  </div>
                  <div className="comment-read-modal-row">
                    <span className="comment-read-modal-k">Record</span>
                    <span className="comment-read-modal-v">
                      {sub.issue != null ? (
                        <a href={`https://github.com/muglikar/ProHealthLedger/issues/${sub.issue}`} target="_blank" rel="noopener noreferrer" className="issue-link">
                          #{sub.issue}
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
                        <span className="audit-comment-redacted" title={`Redacted by moderator on ${sub.redacted_at?.slice(0, 10) || "unknown date"} — category: ${sub.redaction_category || "miscellaneous"}.`}>
                          [redacted by moderator on {sub.redacted_at?.slice(0, 10) || "unknown date"} &mdash; {sub.redaction_category || "miscellaneous"}]
                        </span>
                      ) : (
                        sub.reason || sub.comment || "—"
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default async function ProfilePage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";

  let profiles = [];
  try {
    const res = await readDataFile("data/profiles/_index.json");
    if (Array.isArray(res.data)) profiles = res.data;
  } catch (e) {}

  const profile = profiles.find((p) => p.slug === slug);
  const publicName = formatProfessionalDisplayName(slug, profile?.public_name);
  const titleName = publicName || "Verified Professional";
  
  const vouches = profile?.votes?.yes || 0;
  const flags = profile?.votes?.no || 0;

  // Build JSON-LD
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": ["Person", "Organization"],
    "name": titleName,
    "url": `${CANONICAL_ORIGIN}/profile/${encodeURIComponent(slug)}`,
    "sameAs": profile?.linkedin_url || `https://www.linkedin.com/in/${encodeURIComponent(slug)}`,
  };

  const totalVotes = vouches + flags;
  if (totalVotes > 0) {
    const average = (vouches * 5 + flags * 1) / totalVotes;
    schemaMarkup.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": average.toFixed(1),
      "reviewCount": totalVotes.toString(),
      "bestRating": "5",
      "worstRating": "1"
    };
  }

  // If there are submissions, add reviews to the schema
  if (profile?.submissions && Array.isArray(profile.submissions) && profile.submissions.length > 0) {
    schemaMarkup.review = profile.submissions.map((sub) => {
      const isVouch = sub.vote === "yes";
      return {
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": sub.display_name || sub.user || "Verified Professional"
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": isVouch ? "5" : "1",
          "bestRating": "5",
          "worstRating": "1"
        },
        "datePublished": sub.date || new Date().toISOString().split("T")[0],
        "reviewBody": sub.reason || sub.comment || "Verified professional review for conduct and behavior."
      };
    });
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />
      
      {/* SSR visually hidden summary for bots & screen readers */}
      <div className="sr-only" style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        <h1>{titleName}</h1>
        <p>Professional conduct record on ProHealthLedger.</p>
        <ul>
          <li>Vouches (Would work with again): {vouches}</li>
          <li>Flags (Would not work with again): {flags}</li>
        </ul>
        {profile?.linkedin_url && (
          <a href={profile.linkedin_url}>LinkedIn Profile</a>
        )}
      </div>

      <Suspense
        fallback={
          <ProfileSsrFallback
            profile={profile}
            slug={slug}
            titleName={titleName}
            vouches={vouches}
            flags={flags}
          />
        }
      >
        <ProfilesClient initialSearch={slug} />
      </Suspense>
    </>
  );
}
