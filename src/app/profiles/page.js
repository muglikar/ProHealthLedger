import ProfilesClient from "./ProfilesClient";

const SITE_URL = "https://pro-health-ledger.vercel.app";

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
  const canonical =
    slug.length > 0
      ? `${SITE_URL}/profiles?search=${encodeURIComponent(slug)}`
      : `${SITE_URL}/profiles`;
  const titleBase =
    slug.length > 0
      ? `Look up — ${slug}`
      : "Look up a professional";
  const title = `${titleBase} — Professional Health Ledger`;

  return {
    title,
    description: DEFAULT_DESC,
    alternates: { canonical },
    openGraph: {
      title: `${titleBase} — Professional Health Ledger`,
      description: DEFAULT_DESC,
      url: canonical,
      siteName: "Professional Health Ledger",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${titleBase} — Professional Health Ledger`,
      description: DEFAULT_DESC,
    },
  };
}

export default function ProfilesPage() {
  return <ProfilesClient />;
}
