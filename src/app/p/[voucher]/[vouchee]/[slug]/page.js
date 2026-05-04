import ProfilesClient from "@/app/profiles/ProfilesClient";
import { buildVouchOgUrl } from "@/lib/og-vouch-url";
import { segmentToDisplayName } from "@/lib/og-vouch-card";
import { Suspense } from "react";

/** Crawlers must see the production host on og:image. */
const CANONICAL_ORIGIN = "https://prohealthledger.org";

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
            height: 627,
            type: "image/png",
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: `View the verified professional vouch on ProHealthLedger.`,
        images: [ogUrl],
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
