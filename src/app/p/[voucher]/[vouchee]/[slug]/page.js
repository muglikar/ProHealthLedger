import ProfilesClient from "@/app/profiles/ProfilesClient";
import { Suspense } from "react";

/**
 * STRICT SERVER COMPONENT (No 'use client')
 * This ensures generateMetadata is executed on the server/edge, 
 * which is mandatory for LinkedIn's crawler to see the custom OG tags.
 */

export async function generateMetadata({ params }) {
  try {
    const rawVoucher = params?.voucher || '';
    const rawVouchee = params?.vouchee || '';
    
    // Bulletproof cleaning
    const cleanVoucher = decodeURIComponent(rawVoucher).split('_').join(' ');
    const cleanVouchee = decodeURIComponent(rawVouchee).split('_').join(' ');
    
    // Construct the OG URL with sanitized parameters
    const ogUrl = `https://prohealthledger.org/api/og?voucherName=${encodeURIComponent(cleanVoucher)}&voucheeName=${encodeURIComponent(cleanVouchee)}`;
    const pageUrl = `https://prohealthledger.org/p/${rawVoucher}/${rawVouchee}/${params?.slug}`;

    return {
      title: `${cleanVoucher} vouched for ${cleanVouchee}`,
      description: `View the verified professional vouch on ProHealthLedger.`,
      openGraph: {
        title: `${cleanVoucher} vouched for ${cleanVouchee}`,
        description: `Transparency creates accountability. See the full vouch on the Professional Health Ledger.`,
        url: pageUrl,
        siteName: "Professional Health Ledger",
        images: [
          {
            url: ogUrl,
            width: 1200,
            height: 630,
            alt: `Vouch for ${cleanVouchee} by ${cleanVoucher}`,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image', // THIS IS MANDATORY for LinkedIn Hero Cards
        title: `${cleanVoucher} vouched for ${cleanVouchee}`,
        images: [ogUrl],
      },
    };
  } catch (e) {
    console.error("Metadata generation failed:", e);
    return { title: 'Professional Vouch | Pro-Health Ledger' };
  }
}

export default function VouchPage({ params }) {
  // Pass params down safely to the client component
  return (
    <Suspense fallback={<div className="loading-container" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Opening Professional Ledger...</div>}>
      <ProfilesClient initialSearch={params?.slug} />
    </Suspense>
  );
}
