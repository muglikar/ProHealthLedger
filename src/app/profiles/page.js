import ProfilesClient from "./ProfilesClient";

const SITE_URL = "https://prohealthledger.org";

const OG_IMAGE = `${SITE_URL}/og_banner.png`;

const DEFAULT_DESC =
  "A free, public, and transparent directory of professional experiences. Look up anyone, read honest reviews, and share your own truth to build accountability.";

async function resolvedSearchParams(searchParams) {
  if (searchParams == null) return {};
  return typeof searchParams.then === "function"
    ? await searchParams
    : searchParams;
}

function pickSearch(sp) {
  const raw = sp?.search;
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return "";
}

/** LinkedIn and other crawlers follow og:url / canonical — must match the shared profile link. */
export async function generateMetadata({ searchParams }) {
  const sp = await resolvedSearchParams(searchParams);
  const slug = pickSearch(sp);
  const voucherName = sp?.voucher;
  const voucheeName = sp?.vouchee;
  const voucherPic = sp?.pic;
  const voucheePic = sp?.vepic;

  let dynamicOgImage = OG_IMAGE;
  let ogTitle = "";
  let ogDesc = DEFAULT_DESC;

  if (voucherName && voucheeName) {
    const ogParams = new URLSearchParams();
    ogParams.set('voucherName', voucherName);
    ogParams.set('voucheeName', voucheeName);
    if (voucherPic) ogParams.set('voucherPic', voucherPic);
    if (voucheePic) ogParams.set('voucheePic', voucheePic);
    dynamicOgImage = `${SITE_URL}/api/og?${ogParams.toString()}`;
    ogTitle = `${voucherName} vouched for ${voucheeName}`;
    ogDesc = "Know who you're working with before you commit. One question: “Would you work with them again?”";
  } else {
    const titleBase = slug.length > 0 ? `Look up — ${slug}` : "Look up a professional";
    ogTitle = `${titleBase} — Professional Health Ledger`;
  }

  const canonical =
    slug.length > 0
      ? `${SITE_URL}/profiles?search=${encodeURIComponent(slug)}`
      : `${SITE_URL}/profiles`;

  return {
    title: ogTitle,
    description: ogDesc,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      url: canonical,
      siteName: "Professional Health Ledger",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: dynamicOgImage,
          secureUrl: dynamicOgImage,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: "ProHealthLedger — Know who you are working with before you commit.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
      images: [
        {
          url: dynamicOgImage,
          width: 1200,
          height: 630,
          alt: "ProHealthLedger — Know who you are working with before you commit.",
        },
      ],
    },
  };
}

export default function ProfilesPage() {
  return <ProfilesClient />;
}
