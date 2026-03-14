import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Professional Health Ledger",
  description:
    "A transparent, community-driven professional verification system. Share your genuine work experiences.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="nav-logo">
              <span className="logo-icon">◆</span> ProHealthLedger
            </Link>
            <div className="nav-links">
              <Link href="/profiles">Profiles</Link>
              <Link href="/contributors">Contributors</Link>
              <Link href="/submit">Submit</Link>
            </div>
          </div>
        </nav>
        <main className="main-content">{children}</main>
        <footer className="footer">
          <div className="footer-inner">
            <p className="disclaimer">
              This ledger is a collection of subjective professional
              experiences. The platform does not author or verify these ratings.
              Use at your own risk.
            </p>
            <div className="footer-links">
              <a
                href="https://github.com/muglikar/ProHealthLedger"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <span className="footer-sep">·</span>
              <Link href="/submit">Submit a Vote</Link>
            </div>
            <p className="copyright">
              © {new Date().getFullYear()} Professional Health Ledger. Open
              Source.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
