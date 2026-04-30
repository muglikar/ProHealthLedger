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
  const email = useMemo(() => {
    const user = decodeChars(userChars || []);
    const domain = decodeChars(domainChars || []);
    const tld = decodeChars(tldChars || []);
    return `${user}@${domain}.${tld}`;
  }, [userChars, domainChars, tldChars]);

  return (
    <a className={className} href={`mailto:${email}`}>
      {email}
    </a>
  );
}

