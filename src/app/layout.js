import { Suspense } from "react";
import { Monda } from "next/font/google";
import Link from "next/link";
import Providers from "./providers";
import SiteNav from "./components/SiteNav";
import VoteQuotaStrip from "./components/VoteQuotaStrip";
import ReferralCapture from "./components/ReferralCapture";
import "./globals.css";

const monda = Monda({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-monda",
  display: "swap",
});

const siteUrl = "https://pro-health-ledger.vercel.app";

/** New URL per deploy so LinkedIn/Twitter drop stale og:image caches faster. */
function socialImagePath(pathname) {
  const tag =
    process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA;
  return tag ? `${pathname}?cb=${encodeURIComponent(tag)}` : pathname;
}

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Professional Health Ledger — Know Who You're Working With",
  description:
    "A free, public, and transparent directory of professional experiences. Look up anyone, read honest reviews, and share your own truth to build accountability.",
  icons: {
    icon: { url: "/logo.png", type: "image/png", sizes: "512x512" },
    apple: {
      url: "/logo.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
  openGraph: {
    title: "Professional Health Ledger — Know Who You're Working With",
    description:
      "A free, public, and transparent directory of professional experiences. Look up anyone, read honest reviews, and share your own truth to build accountability.",
    siteName: "Professional Health Ledger",
    type: "website",
    images: [
      {
        /** Static banner only for link previews; `logo.png` is for favicon / PWA only. */
        url: socialImagePath("/og_banner.png"),
        width: 2848,
        height: 1504,
        type: "image/png",
        alt: "ProHealthLedger — Know who you are working with before you commit.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional Health Ledger",
    description:
      "A free, public, and transparent directory of professional experiences. Look up anyone, read honest reviews, and share your own truth to build accountability.",
    images: [socialImagePath("/og_banner.png")],
  },
};

/** Ensures real device width for CSS breakpoints (hamburger @ max-width 768px). */
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={monda.variable}>
      <body>
        <Providers>
          <SiteNav />
          <VoteQuotaStrip />
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          <main className="main-content">{children}</main>
          <footer className="footer">
            <div className="footer-inner">
              <p className="disclaimer">
                This ledger is a collection of subjective professional
                experiences. The platform does not author, verify, or endorse
                any rating. Every vote reflects one individual&apos;s personal
                opinion. Use at your own discretion.
              </p>
              <div className="footer-links">
                <Link href="/transparency">Full Audit Trail</Link>
                <span className="footer-sep">·</span>
                <a
                  href="https://github.com/muglikar/ProHealthLedger"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Source Code
                </a>
                <span className="footer-sep">·</span>
                <Link href="/privacy">Privacy Policy</Link>
                <span className="footer-sep">·</span>
                <a
                  href="https://github.com/muglikar/ProHealthLedger/issues/new?template=request-removal.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Request Removal
                </a>
              </div>
              <p className="copyright">
                © {new Date().getFullYear()} Professional Health Ledger —
                Open Source, Zero Cost, Fully Transparent.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
