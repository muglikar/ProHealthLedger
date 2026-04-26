import ProfilesClient from "@/app/profiles/ProfilesClient";
import { Suspense } from "react";

const SITE_URL = "https://prohealthledger.org";

export async function generateMetadata({ params }) {
  const { voucher, vouchee, slug } = params;

  // Bulletproof cleaning using split/join as requested
  const cleanVoucher = decodeURIComponent(voucher || "Colleague").split('_').join(' ');
  const cleanVouchee = decodeURIComponent(vouchee || "Professional").split('_').join(' ');

  const title = `Vouch for ${cleanVouchee} by ${cleanVoucher} | Pro-Health Ledger`;
  const description = `Know who you're working with before you commit. One question: "Would you work with them again?" — Read ${cleanVoucher}'s official vouch for ${cleanVouchee}.`;

  // Construct OG Image URL with full parameters
  const ogParams = new URLSearchParams({
    voucherName: cleanVoucher,
    voucheeName: cleanVouchee,
    // We don't have pics here easily without a DB hit, 
    // but the OG route handles the placeholder beautifully.
  });
  
  const ogImage = `${SITE_URL}/api/og?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/p/${voucher}/${vouchee}/${slug}`,
      siteName: "Professional Health Ledger",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Vouch for ${cleanVouchee} on Pro-Health Ledger`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function VouchPage({ params }) {
  return (
    <Suspense fallback={<div className="loading-container">Loading ledger...</div>}>
      <ProfilesClient initialSearch={params.slug} />
    </Suspense>
  );
}
