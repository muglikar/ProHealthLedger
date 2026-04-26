import ProfilesClient from "../../../profiles/ProfilesClient";
import { Suspense } from "react";

const SITE_URL = "https://prohealthledger.org";
const OG_IMAGE = `${SITE_URL}/og_banner.png`;

async function resolvedParams(params) {
  if (params == null) return {};
  return typeof params.then === "function" ? await params : params;
}

export async function generateMetadata({ params }) {
  const p = await resolvedParams(params);
  // Path: /vouch/[voucher]/[vouchee]/[slug]
  const voucherName = decodeURIComponent(p.voucher || "");
  const voucheeName = decodeURIComponent(p.vouchee || "");
  const slug = decodeURIComponent(p.slug || "");

  // Note: For pics, we'll still use query params on this clean path 
  // or just rely on the names if pics aren't in the path.
  const ogTitle = `${voucherName} vouched for ${voucheeName}`;
  const ogDesc = "Know who you're working with before you commit. One question: “Would you work with them again?”";
  
  const ogParams = new URLSearchParams();
  ogParams.set('voucherName', voucherName);
  ogParams.set('voucheeName', voucheeName);
  // We can't easily put large pic URLs in the path, so we'll look for them 
  // in the actual searchParams if they exist, but for now, names are the priority.
  const dynamicOgImage = `${SITE_URL}/api/og?${ogParams.toString()}`;

  return {
    title: ogTitle,
    description: ogDesc,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      url: `${SITE_URL}/vouch/${p.voucher}/${p.vouchee}/${p.slug}`,
      siteName: "Professional Health Ledger",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: dynamicOgImage,
          width: 1200,
          height: 630,
          alt: `Vouch from ${voucherName} to ${voucheeName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
      images: [dynamicOgImage],
    },
  };
}

export default function VouchSharePage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading Ledger...</div>}>
      <ProfilesClient />
    </Suspense>
  );
}
