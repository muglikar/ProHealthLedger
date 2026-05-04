import ProfilesClient from "@/app/profiles/ProfilesClient";
import { buildVouchOpengraphImageUrl } from "@/lib/og-vouch-url";
import { segmentToDisplayName } from "@/lib/og-vouch-card";
import { Suspense } from "react";

/** Crawlers must see the production host on og:image. */
const CANONICAL_ORIGIN = "https://prohealthledger.org";

/** `og:image` / `twitter:image` → `/p/.../opengraph-image` (canonical for share uploads + scrapers). */

export async function generateMetadata({ params }) {
  const resolvedParams = await params; // Mandatory in Next.js 15+
  try {
    const cleanVoucher = segmentToDisplayName(resolvedParams?.voucher);
    const cleanVouchee = segmentToDisplayName(resolvedParams?.vouchee);
    const ogUrl = buildVouchOpengraphImageUrl(
      CANONICAL_ORIGIN,
      resolvedParams?.voucher,
      resolvedParams?.vouchee,
      resolvedParams?.slug
    );
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
            height: 630,
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
