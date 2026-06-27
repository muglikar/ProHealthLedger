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
          <div
            className="loading-container"
            style={{ padding: "40px", textAlign: "center", color: "#64748b" }}
          >
            Opening Professional Ledger...
          </div>
        }
      >
        <ProfilesClient initialSearch={slug} />
      </Suspense>
    </>
  );
}
