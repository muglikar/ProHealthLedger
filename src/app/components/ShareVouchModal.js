"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { formatProfessionalDisplayName } from "@/lib/profiles";

const SITE_URL = "https://prohealthledger.org";

/**
 * buildShareText
 * 
 * Rotates through the user's 5 exact curated styles.
 * Styles 1-3: Third Person (Sharing a vouch you wrote for someone)
 * Styles 4-5: First Person (Sharing your own ledger)
 */
function buildShareText(displayName, firstPerson = false) {
  if (firstPerson) {
    // Styles 4 & 5 (Self-Share)
    const hashtags = "#CareerGrowth #PersonalBranding #Networking #ProfessionalDevelopment #FutureOfWork";
    const options = [
      {
        text: "Your professional career track record belongs to you — not to the HR department of your previous company.\n\n" +
          "I'm building my portable reputation on Professional Health Ledger. Massive thanks to the colleagues and partners who have already staked their own reputation to vouch for my work. Transparency creates accountability, and I believe the best way to do business is out in the open.\n\n" +
          "If we've worked together, I'd be honored if you added your experience to my Professional Health Ledger. And the next time you're evaluating a partner or hire, look them up.\n\n" +
          "Check out my track record here: ",
        tags: hashtags
      },
      {
        text: "Your career's reputation belongs to you — not to your previous company's HR department.\n\n" +
          "I'm building my portable reputation on Professional Health Ledger. Transparency creates accountability, and the best way to do business is out in the open.\n\n" +
          "Big thanks to those who have already staked their reputation to vouch for my work. If we've worked together, I'd be honored to have your honest review on my Professional Health Ledger.\n\n" +
          "Before your next hire or partnership, look them up. If they aren't here, ask them to bring their track record to the table.\n\n" +
          "Check out my public Professional Health Ledger: ",
        tags: hashtags
      }
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // Styles 1, 2 & 3 (Third Person)
  const hashtags = "#ProfessionalIntegrity #WorkplaceCulture #Accountability #Transparency #LeadershipDevelopment";
  const options = [
    {
      text: "Traditional reference checks are broken—nobody lists references who won't say nice things. A professional track record shouldn't vanish when you change companies; it should be portable.\n\n" +
        `I just staked my own professional reputation on Professional Health Ledger to officially vouch for my friend and colleague, ${displayName}'s work ethic.\n\n` +
        "Before you finalize your next hire or partnership, check if they have a public Professional Health Ledger on ProHealthLedger.org. If they aren't there yet, ask them to bring their professional references to the table.\n\n" +
        `You can see my vouch for ${displayName} here: `,
      tags: hashtags
    },
    {
      text: `In a world of generic LinkedIn endorsements, I wanted to put something more meaningful on the record for ${displayName}.\n\n` +
        "I just added my official vouch for them on Professional Health Ledger. Your reputation is your most valuable asset, and it's time we start actively building public, verified track records.\n\n" +
        "Who is the best person you've worked with recently? Look them up. If they aren't on the Professional Health Ledger yet, be the first one to start their portable reputation.\n\n" +
        `Read my vouch for ${displayName} here: `,
      tags: hashtags
    },
    {
      text: `Resumes tell you what someone did. A verified vouch tells you how they did it and how they treat people.\n\n` +
        `I just added an official vouch for ${displayName} on Professional Health Ledger — an immutable record of how people actually work. It's time we start actively building public, portable track records.\n\n` +
        "Who's the best person you've worked with recently? Look them up. If they aren't on the Professional Health Ledger yet, be the first to start their portable reputation.\n\n" +
        `Read my vouch for ${displayName}: `,
      tags: hashtags
    }
  ];

  return options[Math.floor(Math.random() * options.length)];
}

export default function ShareVouchModal({ data, onClose, firstPerson = false }) {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [postingDirect, setPostingDirect] = useState(false);
  const [directPostResult, setDirectPostResult] = useState(null);
  const [directPostErrorDetails, setDirectPostErrorDetails] = useState("");
  const [refCode, setRefCode] = useState("");

  const displayName = formatProfessionalDisplayName(data.profile_slug, data.public_name);
  const slug = typeof data.profile_slug === "string" ? data.profile_slug.trim() : "";

  const voucherName = data.display_name || "a colleague";
  const voucherClean = voucherName.replace(/ /g, "_").replace(/\//g, "-");
  const voucheeClean = displayName.replace(/ /g, "_").replace(/\//g, "-");

  const cleanPathUrl = `${SITE_URL}/p/${encodeURIComponent(voucherClean)}/${encodeURIComponent(voucheeClean)}/${encodeURIComponent(slug || "unknown")}`;
  const finalShareUrl = refCode ? `${cleanPathUrl}?ref=${refCode}` : cleanPathUrl;

  const shareData = useMemo(
    () => buildShareText(displayName, firstPerson),
    [displayName, firstPerson]
  );

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

  const doPost = useCallback(async () => {
    setPostingDirect(true);
    setDirectPostResult(null);
    setDirectPostErrorDetails("");

    try {
      const res = await fetch("/api/share-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentary: `${shareData.text}${finalShareUrl}\n\n${shareData.tags}`,
          articleUrl: finalShareUrl,
          articleTitle: `${voucherName} vouched for ${displayName} on Professional Health Ledger`,
          articleDescription: "Know who you're working with before you commit.",
          cleanVoucher: voucherName,
          cleanVouchee: displayName,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setDirectPostResult("success");
        console.log("[PHL Share] Post success:", {
          postId: json.postId,
          thumbnailIncluded: json.thumbnailIncluded,
          handshake: json.handshake,
        });
      } else {
        setDirectPostResult("error");
        setDirectPostErrorDetails(json.error || "LinkedIn rejected the post.");
      }
    } catch (err) {
      setDirectPostResult("error");
      setDirectPostErrorDetails("Failed to reach LinkedIn API.");
    } finally {
      setPostingDirect(false);
    }
  }, [shareData, finalShareUrl, displayName, voucherName, slug]);

  const handleDirectPost = useCallback(() => {
    doPost();
  }, [doPost]);

  const handleCopyOnly = useCallback(() => {
    const toCopy = `${shareData.text}${finalShareUrl}\n\n${shareData.tags}`;
    navigator.clipboard.writeText(toCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => { });
  }, [shareData, finalShareUrl]);

  return (
    <>
      <div className="share-modal-backdrop" onClick={onClose} />
      <div className="share-modal" role="dialog" aria-modal="true">
        <div className="share-modal-header">
          <h3>{firstPerson ? "Share Your Ledger" : "Vouch Shared!"}</h3>
          <button type="button" className="share-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="share-modal-body">
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: '#475569', marginBottom: '20px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
            {shareData.text}{finalShareUrl}{"\n\n"}{shareData.tags}
          </div>
        </div>

        <div className="share-modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {directPostResult === "success" ? (
            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#15803d', textAlign: 'center', fontWeight: 'bold' }}>
              ✓ Posted to LinkedIn!
            </div>
          ) : (
            <>
              <button type="button" className="btn-linkedin-direct" onClick={handleDirectPost} disabled={postingDirect} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                {postingDirect ? "Posting..." : "Post to LinkedIn"}
              </button>
              
              {!firstPerson && slug && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginTop: '-4px', marginBottom: '4px' }}>
                  If you want to tag the person, you can just edit the post natively on LinkedIn.
                </div>
              )}

              <button type="button" className="btn-copy-manual" onClick={handleCopyOnly} style={{ width: '100%', background: 'transparent', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                {copied ? "✓ Copied!" : "Copy Text for Manual Post"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
