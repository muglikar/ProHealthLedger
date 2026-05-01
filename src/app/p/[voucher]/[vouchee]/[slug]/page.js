import ProfilesClient from "@/app/profiles/ProfilesClient";
import { Suspense } from "react";

/**
 * STRICT SERVER COMPONENT (No 'use client')
 * This ensures generateMetadata is executed on the server/edge, 
 * which is mandatory for LinkedIn's crawler to see the custom OG tags.
 */

export async function generateMetadata({ params }) {
  const resolvedParams = await params; // Mandatory in Next.js 15+
  try {
    const cleanVoucher = decodeURIComponent(resolvedParams?.voucher || '').split('_').join(' ');
    const cleanVouchee = decodeURIComponent(resolvedParams?.vouchee || '').split('_').join(' ');
    const ogUrl = `https://prohealthledger.org/api/og?voucherName=${encodeURIComponent(cleanVoucher)}&voucheeName=${encodeURIComponent(cleanVouchee)}`;
    const pageUrl = `https://prohealthledger.org/p/${encodeURIComponent(
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
