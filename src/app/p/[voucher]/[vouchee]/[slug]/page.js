import ProfilesClient from "@/app/profiles/ProfilesClient";
import { buildVouchOgUrl } from "@/lib/og-vouch-url";
import { Suspense } from "react";

const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://prohealthledger.org"
).replace(/\/+$/, "");

function segmentToDisplayName(segment) {
  let s = decodeURIComponent(segment || "")
    .replace(/_/g, " ")
    .trim();
  if (!s) return "";
  if (!/\s/.test(s)) {
    s = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  }
  return s;
}

/**
 * STRICT SERVER COMPONENT (No 'use client')
 * This ensures generateMetadata is executed on the server/edge, 
 * which is mandatory for LinkedIn's crawler to see the custom OG tags.
 */

export async function generateMetadata({ params }) {
  const resolvedParams = await params; // Mandatory in Next.js 15+
  try {
    const cleanVoucher = segmentToDisplayName(resolvedParams?.voucher);
    const cleanVouchee = segmentToDisplayName(resolvedParams?.vouchee);
    const ogUrl = buildVouchOgUrl(SITE_ORIGIN, cleanVoucher, cleanVouchee);
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
        images: [
          {
            url: ogUrl,
            secureUrl: ogUrl,
            width: 1200,
            height: 630,
            alt: title,
            type: "image/png",
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: `View the verified professional vouch on ProHealthLedger.`,
        images: [ogUrl],
      }
    };
  } catch(e) { 
    return { title: 'Verified Vouch | ProHealthLedger' }; 
  }
}

export default async function VouchPage({ params }) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<div className="loading-container" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Opening Professional Ledger...</div>}>
      <ProfilesClient initialSearch={resolvedParams?.slug} />
    </Suspense>
  );
}
