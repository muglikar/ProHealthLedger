import { Suspense } from "react";
import { Monda } from "next/font/google";
import Link from "next/link";
import Providers from "./providers";
import SiteNav from "./components/SiteNav";
import VoteQuotaStrip from "./components/VoteQuotaStrip";
import OwnerActivityStrip from "./components/OwnerActivityStrip";
import VerifyReminderStrip from "./components/VerifyReminderStrip";
import AdminReminders from "./components/AdminReminders";
import ReferralCapture from "./components/ReferralCapture";
import ComplianceBanner from "./components/ComplianceBanner";
import FeedbackFAB from "./components/FeedbackFAB";
import "./globals.css";

const monda = Monda({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-monda",
  display: "swap",
});

const siteUrl = "https://prohealthledger.org";

/**
 * Do not set default og:image here: it was merging ahead of vouch pages so some
 * crawlers (LinkedIn feed) attached the homepage banner instead of /opengraph-image.
 * Homepage images live in `src/app/page.js` only.
 */
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
    url: siteUrl,
    siteName: "Professional Health Ledger",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional Health Ledger",
    description:
      "A free, public, and transparent directory of professional experiences. Look up anyone, read honest reviews, and share your own truth to build accountability.",
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
          <OwnerActivityStrip />
          <VerifyReminderStrip />
          <AdminReminders />
          <ComplianceBanner />
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          <Suspense fallback={null}>
            <FeedbackFAB />
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
                <Link href="/terms">Terms</Link>
                <span className="footer-sep">·</span>
                <Link href="/data-rights">Data Rights</Link>
                <span className="footer-sep">·</span>
                <Link href="/request-removal">Request Removal</Link>
              </div>
              <p className="copyright">
                © {new Date().getFullYear()} Professional Health Ledger —
                Open Source, Zero Cost, Fully Transparent.
              </p>
              <p className="footer-attribution">
                Icons by Flaticon —{" "}
                <a href="https://www.flaticon.com/free-icons/help" title="help icons" target="_blank" rel="noopener noreferrer">
                  Help icons created by Freepik - Flaticon
                </a>
              </p>
            </div>
          </footer>
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(event) {
                fetch('/api/telemetry', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: 'error',
                    metadata: { message: event.message, stack: event.error ? event.error.stack : null },
                    url: window.location.href
                  })
                }).catch(() => {});
              });
              window.addEventListener('unhandledrejection', function(event) {
                fetch('/api/telemetry', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: 'unhandled_rejection',
                    metadata: { reason: String(event.reason) },
                    url: window.location.href
                  })
                }).catch(() => {});
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
