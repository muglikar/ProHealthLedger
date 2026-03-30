"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavAuth from "./NavAuth";

const NAV_LINKS = [
  { href: "/profiles", label: "Look Up" },
  { href: "/transparency", label: "All Votes" },
  { href: "/contributors", label: "Contributors" },
  { href: "/submit", label: "Submit" },
];

export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.documentElement.classList.add("nav-menu-open");
    } else {
      document.documentElement.classList.remove("nav-menu-open");
    }
    return () => document.documentElement.classList.remove("nav-menu-open");
  }, [menuOpen]);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link
          href="/"
          className="nav-logo"
          onClick={() => setMenuOpen(false)}
        >
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={40}
            className="logo-icon"
            priority
          />
          <span className="nav-logo-text">ProHealthLedger</span>
        </Link>

        <div className="nav-desktop-only nav-right">
          <div className="nav-links">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <NavAuth />
        </div>

        <button
          type="button"
          className={`nav-burger${menuOpen ? " nav-burger-open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="site-nav-drawer"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <span className="nav-burger-line" />
          <span className="nav-burger-line" />
          <span className="nav-burger-line" />
        </button>
      </div>

      {menuOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="nav-drawer-backdrop"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div
                id="site-nav-drawer"
                className="nav-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Site navigation"
              >
                <div className="nav-drawer-inner">
                  <ul className="nav-drawer-links">
                    {NAV_LINKS.map(({ href, label }) => (
                      <li key={href}>
                        <Link href={href} onClick={() => setMenuOpen(false)}>
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="nav-drawer-auth">
                    <NavAuth />
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </nav>
  );
}
