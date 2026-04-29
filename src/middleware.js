import { NextResponse } from "next/server";

const ALLOWED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://prohealthledger.org"
).replace(/\/+$/, "");

function normalizeOriginFromReferer(referer) {
  if (!referer) return "";
  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

/**
 * Explicit CSRF defense for state-changing API routes.
 * Requires Origin or Referer to match configured site origin.
 */
export function middleware(req) {
  if (!ALLOWED_METHODS.has(req.method)) return NextResponse.next();
  if (!req.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/auth/")) return NextResponse.next();

  const origin = (req.headers.get("origin") || "").replace(/\/+$/, "");
  const refererOrigin = normalizeOriginFromReferer(req.headers.get("referer"));

  const sameOrigin =
    (origin && origin === SITE_ORIGIN) ||
    (refererOrigin && refererOrigin === SITE_ORIGIN);

  if (!sameOrigin) {
    return NextResponse.json(
      { error: "CSRF validation failed: origin mismatch." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

