import ProfilesClient from "./ProfilesClient";
import { readDataFile } from "@/lib/github";

const SITE_URL = "https://prohealthledger.org";

const OG_IMAGE = `${SITE_URL}/og_banner.png`;

const DEFAULT_DESC =
  "The Good Boss & Good Colleagues Ledger. A free, public, and transparent directory of professional experiences. Look up anyone, vouch for great leaders, and help build accountability.";

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

/** LinkedIn and other crawlers follow og:url / canonical — must match the shared search query. */
export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const slug = pickSearch(sp);

  const titleBase = slug.length > 0 ? `Ledger search — ${slug}` : "Look up a professional";
  const ogTitle = `${titleBase} — Professional Health Ledger`;

  const canonical =
    slug.length > 0
      ? `${SITE_URL}/profiles?search=${encodeURIComponent(slug)}`
      : `${SITE_URL}/profiles`;

  return {
    title: ogTitle,
    description: DEFAULT_DESC,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description: DEFAULT_DESC,
      url: canonical,
      siteName: "Professional Health Ledger",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "ProHealthLedger — Know who you are working with before you commit.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: DEFAULT_DESC,
      images: [OG_IMAGE],
    },
  };
}

export default async function ProfilesPage() {
  let profiles = [];
  try {
    const res = await readDataFile("data/profiles/_index.json");
    if (Array.isArray(res.data)) profiles = res.data;
  } catch (e) {}

  return <ProfilesClient initialProfiles={profiles} />;
}
