import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Providers from "./providers";
import SiteNav from "./components/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Professional Health Ledger — Know Who You're Working With",
  description:
    "A free, public directory of honest professional experiences. Look up anyone. Share your truth.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <SiteNav />
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
