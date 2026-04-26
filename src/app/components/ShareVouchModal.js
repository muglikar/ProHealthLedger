"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { formatProfessionalDisplayName } from "@/lib/profiles";

const SITE_URL = "https://prohealthledger.org";

function buildShareText(displayName, firstPerson = false, voucherId = null, voucherName = "", vouchedForId = null) {
  const mentorTag = voucherId ? `@[${voucherName}](urn:li:person:${voucherId})` : voucherName;
  const vouchedForTag = vouchedForId ? `@[${displayName}](urn:li:person:${vouchedForId})` : displayName;

  if (firstPerson) {
    const firstPersonOptions = [
      {
        text: "Your professional career track record belongs to you — not to the HR department of your previous company.\n\n" +
          "I'm building my portable reputation on Pro-Health Ledger. Massive thanks to the colleagues and partners like " + mentorTag + " who have already staked their own reputation to vouch for my work. Transparency creates accountability, and I believe the best way to do business is out in the open.\n\n" +
          "If we've worked together, I'd be honored if you added your experience to my Professional-Health Ledger.\n\n" +
          "Check out my track record here:",
        tags: "#CareerGrowth #PersonalBranding #Networking #ProfessionalDevelopment #FutureOfWork"
      },
      {
        text: "Your career's reputation belongs to you — not to your previous company's HR department.\n\n" +
          "I'm building my portable reputation on Pro-Health Ledger. Transparency creates accountability, and the best way to do business is out in the open.\n\n" +
          "Big thanks to " + mentorTag + " and others who have already staked their reputation to vouch for my work.\n\n" +
          "Check out my public Professional Health Ledger:",
        tags: "#ProfessionalIntegrity #WorkplaceCulture #Accountability #Transparency #LeadershipDevelopment"
      }
    ];
    return firstPersonOptions[Math.floor(Math.random() * firstPersonOptions.length)];
  }

  const thirdPersonOptions = [
    {
      text: "Traditional reference checks are broken—nobody lists references who won't say nice things. A professional track record shouldn't vanish when you change companies; it should be portable.\n\n" +
        `I just staked my own professional reputation on Pro-Health Ledger to officially vouch for my colleague, ${vouchedForTag}'s work ethic.\n\n` +
        "Before you finalize your next hire or partnership, look up their Professional Health Ledger.\n\n" +
        `Read my vouch for ${displayName}:`,
      tags: "#HiringTransparency #RecruitmentInnovation #FutureOfWork #TalentAcquisition #HRTech"
    },
    {
      text: "In a world of generic LinkedIn endorsements, I wanted to put something more meaningful on the record for " + vouchedForTag + ".\n\n" +
        "I just added my official vouch for them on Pro-Health Ledger. Your reputation is your most valuable asset, and it's time we start actively building public, verified track records.\n\n" +
        `Read my vouch for ${displayName}:`,
      tags: "#PersonalBranding #CareerGrowth #ProfessionalDevelopment #Transparency #Trust"
    }
  ];

  return thirdPersonOptions[Math.floor(Math.random() * thirdPersonOptions.length)];
}

export default function ShareVouchModal({ data, onClose, firstPerson = false }) {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [postingDirect, setPostingDirect] = useState(false);
  const [directPostResult, setDirectPostResult] = useState(null); // "success" | "error" | null
  const [directPostErrorDetails, setDirectPostErrorDetails] = useState("");
  const [refCode, setRefCode] = useState("");

  const displayName = formatProfessionalDisplayName(data.profile_slug, data.public_name);
  const slug = typeof data.profile_slug === "string" ? data.profile_slug.trim() : "";

  // Extract voucher identity
  const voucherName = data.display_name || "a colleague";
  const rawVoucherId = typeof data.user === "string" && data.user.startsWith("linkedin:")
    ? data.user.slice(9)
    : null;

  // Clean names for URL construction
  const voucherClean = voucherName.replace(/ /g, "_").replace(/\//g, "-");
  const voucheeClean = displayName.replace(/ /g, "_").replace(/\//g, "-");

  // Build the /p/ clean path URL
  const cleanPathUrl = `${SITE_URL}/p/${encodeURIComponent(voucherClean)}/${encodeURIComponent(voucheeClean)}/${encodeURIComponent(slug || "unknown")}`;
  const finalShareUrl = refCode ? `${cleanPathUrl}?ref=${refCode}` : cleanPathUrl;

  // Build the OG image URL (text-only, instant generation)
  const ogUrl = `${SITE_URL}/api/og?voucherName=${encodeURIComponent(voucherClean)}&voucheeName=${encodeURIComponent(voucheeClean)}`;

  const shareData = useMemo(
    () => buildShareText(displayName, firstPerson, rawVoucherId, voucherName),
    [displayName, firstPerson, rawVoucherId, voucherName]
  );

  // Generate referral code on mount
  useEffect(() => {
    fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileSlug: data.profile_slug, profileName: data.public_name }),
    })
      .then((res) => res.json())
      .then((json) => { if (json.refCode) setRefCode(json.refCode); })
      .catch((err) => console.error("Referral failed", err));
  }, [data]);

  // --- Direct API Post to LinkedIn ---
  const handleDirectPost = useCallback(async () => {
    setPostingDirect(true);
    setDirectPostResult(null);
    setDirectPostErrorDetails("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s total limit

    try {
      const res = await fetch("/api/share-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentary: `${shareData.text} ${finalShareUrl}\n\n${shareData.tags}`,
          articleUrl: finalShareUrl,
          articleTitle: firstPerson
            ? `Professional Health Ledger — ${displayName}`
            : `${voucherName} vouched for ${displayName}`,
          articleDescription: "Know who you're working with before you commit. Would you work with them again?",
          ogUrl,
          voucherUrn: rawVoucherId || null,
          cleanVoucher: voucherName,
          cleanVouchee: displayName,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error("Invalid server response format.");
      }

      if (res.ok && json.ok) {
        setDirectPostResult("success");
      } else {
        console.error("Direct post failed:", json);
        setDirectPostResult("error");
        setDirectPostErrorDetails(json.details || json.error || "LinkedIn rejected the post.");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("LinkedIn direct post error:", err);
      setDirectPostResult("error");
      if (err.name === "AbortError") {
        setDirectPostErrorDetails("LinkedIn API timed out. Please try the manual share.");
      } else {
        setDirectPostErrorDetails(err.message || "Failed to reach LinkedIn.");
      }
    } finally {
      setPostingDirect(false);
    }
  }, [shareData, finalShareUrl, firstPerson, displayName, voucherName, ogUrl, rawVoucherId]);

  // Manual copy fallback
  const handleCopyOnly = useCallback(() => {
    const toCopy = `${shareData.text} ${finalShareUrl}\n\n${shareData.tags}`;
    navigator.clipboard.writeText(toCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {});
  }, [shareData, finalShareUrl]);

  // Escape key handler
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="share-modal-backdrop" onClick={onClose} />
      <div className="share-modal" role="dialog" aria-modal="true" aria-label="Share vouch on LinkedIn">
        <div className="share-modal-header">
          <h3>{firstPerson ? "Share Your Ledger" : "Vouch Shared!"}</h3>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="share-modal-body">
          <p className="share-modal-hint" style={{ marginBottom: '20px' }}>
            {firstPerson
              ? "Your professional reputation is portable. Share this updated ledger to your LinkedIn feed."
              : "Recognition works best when public. Post this vouch to LinkedIn to build their professional track record."}
          </p>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', marginBottom: '20px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
            {shareData.text}{" "}{finalShareUrl}{"\n\n"}{shareData.tags}
          </div>
        </div>

        <div className="share-modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {directPostResult === "success" ? (
            <div className="share-modal-success" role="status" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <strong style={{ color: '#15803d' }}>Posted to your LinkedIn feed!</strong>
            </div>
          ) : directPostResult === "error" ? (
            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <p style={{ margin: '0 0 8px', fontWeight: '700', color: '#b91c1c' }}>Direct posting failed.</p>
              <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#7f1d1d' }}>{directPostErrorDetails}</p>
              <button
                type="button"
                className="btn-copy-manual"
                onClick={handleCopyOnly}
                style={{ width: '100%', background: 'white', border: '1px solid #fca5a5', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                {copied ? "✓ Copied!" : "Copy Text for Manual Post"}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn-linkedin-direct"
                onClick={handleDirectPost}
                disabled={postingDirect}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                {postingDirect ? "Posting to LinkedIn…" : "Post to LinkedIn"}
              </button>

              <button
                type="button"
                className="btn-copy-manual"
                onClick={handleCopyOnly}
                style={{ width: '100%', background: 'transparent', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                {copied ? "✓ Copied!" : "Copy Text for Manual Post"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
