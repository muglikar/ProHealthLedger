"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

/**
 * Invisible component that captures referral codes from the URL.
 * - Records clicks via POST /api/referrals/click
 * - Stores the ref code in localStorage for signup attribution after sign-in
 * - After sign-in, calls POST /api/referrals/signup to attribute the new user
 */
export default function ReferralCapture() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;

    // Only fire click tracking once per ref code per browser session
    const clickedKey = `prohl_ref_clicked_${ref}`;
    if (!sessionStorage.getItem(clickedKey)) {
      fetch("/api/referrals/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refCode: ref }),
      }).catch(() => {});
      sessionStorage.setItem(clickedKey, "1");
    }

    // Persist for signup attribution (survives the sign-in redirect)
    localStorage.setItem("prohl_ref", ref);
  }, [searchParams]);

  // After sign-in, attribute signup
  useEffect(() => {
    if (status !== "authenticated" || !session?.userId) return;
    const ref = localStorage.getItem("prohl_ref");
    if (!ref) return;

    const attributedKey = `prohl_ref_attributed_${ref}`;
    if (localStorage.getItem(attributedKey)) return;

    fetch("/api/referrals/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refCode: ref }),
    })
      .then(() => {
        localStorage.setItem(attributedKey, "1");
        localStorage.removeItem("prohl_ref");
      })
      .catch(() => {});
  }, [status, session]);

  return null;
}
