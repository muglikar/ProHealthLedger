import ProfilesClient from "@/app/profiles/ProfilesClient";
import { segmentToDisplayName } from "@/lib/og-vouch-card";
import { Suspense } from "react";

const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://prohealthledger.org"
).replace(/\/+$/, "");

/**
 * STRICT SERVER COMPONENT (No 'use client')
 * og:image comes from ./opengraph-image.js. Root layout no longer sets a global
 * og:image, so crawlers do not pick the homepage banner for vouch permalinks.
 */

export async function generateMetadata({ params }) {
  const resolvedParams = await params; // Mandatory in Next.js 15+
  try {
    const cleanVoucher = segmentToDisplayName(resolvedParams?.voucher);
    const cleanVouchee = segmentToDisplayName(resolvedParams?.vouchee);
    const pageUrl = `${SITE_ORIGIN}/p/${encodeURIComponent(
      resolvedParams?.voucher || ""
    )}/${encodeURIComponent(resolvedParams?.vouchee || "")}/${encodeURIComponent(
      resolvedParams?.slug || ""
    )}`;
    const title = `${cleanVoucher} vouched for ${cleanVouchee} on Professional Health Ledger`;

    return {
      title,
      description: `View the verified professional vouch on ProHealthLedger.`,
      openGraph: {
        title,
        description: `View the verified professional vouch on ProHealthLedger.`,
        type: "article",
        url: pageUrl,
        siteName: "Professional Health Ledger",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: `View the verified professional vouch on ProHealthLedger.`,
      },
    };
  } catch (e) {
    return { title: "Verified Vouch | ProHealthLedger" };
  }
}

export default async function VouchPage({ params }) {
  const resolvedParams = await params;
  return (
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
      <ProfilesClient initialSearch={resolvedParams?.slug} />
    </Suspense>
  );
}
