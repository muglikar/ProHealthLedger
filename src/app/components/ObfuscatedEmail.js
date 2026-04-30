"use client";

import { useMemo } from "react";

function decodeChars(chars) {
  return String.fromCharCode(...chars);
}

/**
 * Renders an email address without embedding the plain email string in SSR HTML.
 * This reduces basic scraper harvesting from static page source.
 */
export default function ObfuscatedEmail({
  userChars,
  domainChars,
  tldChars,
  className,
}) {
  const { email, display } = useMemo(() => {
    const user = decodeChars(userChars || []);
    const domain = decodeChars(domainChars || []);
    const tld = decodeChars(tldChars || []);
    return {
      email: `${user}@${domain}.${tld}`,
      display: `${user} [at] ${domain} [dot] ${tld}`,
    };
  }, [userChars, domainChars, tldChars]);

  const handleClick = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <a
      className={className}
      href="#"
      onClick={handleClick}
      rel="nofollow"
      aria-label="Send email"
      title="Click to open your email app"
    >
      {display}
    </a>
  );
}

