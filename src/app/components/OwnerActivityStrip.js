"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";

const BLOG_POST_TEXT = `I once joined a company where, day in and day out, I was publicly belittled in front of my peer group of at least 10 senior people and my team of AI engineers.

The manager crossed every professional and personal boundary imaginable. When my kids fell ill and I had to take a couple of leaves and work-from-homes, he openly questioned and ridiculed my homemaker spouse’s responsibility in taking care of them. Abusive language and explicit vulgar hand gestures were the norm—even during meetings where the HR lady was present in the room.

The physical and mental toll was brutal. I had crushing daily headaches, eating Saridons (headache releiving OTC tablets) like peanuts. For the first time in my life, I faced sustained high blood pressure for weeks and massive abnormalities in my blood reports. I had to seek psychological counseling from the company-provided professional, only to be told by both HRs and the counselor to simply "be stronger and ignore the manager's words."

During those dark days, a single thought kept running through my head: *Had there been a single place to look up this individual's professional reputation and how he treated his reportees, I would never have signed that offer letter.*

This experience taught me a profound lesson about the corporate world.

We have platforms like Glassdoor and AmbitionBox to rate companies. But companies aren't inherently good or bad. A company is just a financial and legal entity created for limited liability. It is only as good or as bad as the people who make it. You can find incredibly good people in bad companies, and deeply toxic people in highly reputed organizations.

People don’t leave bad companies. They leave bad managers.

To bring real accountability to professional conduct—and to ensure good actors are recognized while bad patterns become visible—I built **Professional Health Ledger (PHL)**.

Tagline: 🎯 **"Know who you're working with before you commit."**

---

### How does it work?

1️⃣ 📤 **Share/Paste:** Paste the professional's LinkedIn profile URL; answer the one question: "Would I work with them again?” with optional reason.
2️⃣ 📜 **Public record:** Stored in the open audit trail. No edits after submit.
3️⃣ 🔍 **Look up:** Check vouches and flags before you hire, partner, or join.

---

PHL is an open-source, not-for-profit public utility. Because I wanted to build something genuinely constructive rather than just another toxic internet playground, I engineered specific guardrails into its core:

* **The Net-Zero Karma System:** To prevent the platform from becoming a tool for mindless review-bombing, it operates on a balance. You must first cast a positive vouch for a deserving colleague to earn one "flag" credit. You have to contribute goodness to the ecosystem before you can call out a bad pattern.
* **Identity-Verified Integrity:** Anonymous review sites often devolve into battlegrounds of fake profiles, requiring a battery of lawyers to navigate. PHL is non-anonymous by design and for legal compliance. Real, verified professional identities ensure high-trust data and true accountability.
* **Positive-Only Social Sharing:** To protect professional integrity and prevent public pile-ons, users can only share positive vouches directly to LinkedIn. Negative flags remain quietly on the ledger for lookups only, but they cannot be weaponized across social networks.
* **Open Source & Transparent:** Built in strict compliance with our platform partners' legal guidelines as well as attempted compliance with Indian and European privacy laws, every action on PHL is logged in a public audit trail. Absolute transparency protects everyone.

---
Now the big question: If it's not anonymous, who will ever vouch or specifically flag anyone? The question is deliberately set in future: "Would you work with them again?” Answer to this question being an opinion, cannot usually be challenged legally as its not a factual allegation. Also, future being future is as unpreditable as it comes, situations change, people change. So who knows, you may end up working with them again and the answer you gave here was only based on your past experience working with / for them.

🛡️ **It's safe to speak up.**

“Would I work with them again?” — only you can answer that. Your honest yes-or-no is a personal opinion, not a factual allegation, and good-faith opinions for the public good are protected expression under law. Every reason or comment submission is reviewed by a moderator for professional language compliance and abuse / vulgarity detection before publishing.

*(This is not legal advice. Laws vary by jurisdiction; consult a qualified lawyer if you have specific concerns.)*

---

I have spent a long time thinking through the nuances of this tool to ensure it is safe, legally compliant, and fair. But I know it may still not be perfect.

If you find any bugs or have structural suggestions, my DMs are open. For the developers out there who want to help build a higher standard of professional integrity, the project is open-source, and we welcome your pull requests on GitHub.

Let’s build a workplace culture where conduct and how one treats people matter.

👉 Explore the ledger, lookup someone, or vouch for a world-class colleague today: [Link in the first comment]

#FutureOfWork #WorkplaceCulture #Leadership #Management #Transparency #OpenSource #Accountability #ProfessionalHealthLedger`;

export default function OwnerActivityStrip() {
  const { data: session, status } = useSession();
  const [payload, setPayload] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastPostedDate, setLastPostedDate] = useState("");

  const isLedgerAdmin =
    Boolean(session?.siteAdmin) ||
    (session?.userId ? isRepoMaintainerUserId(session.userId) : false);

  const load = useCallback(async () => {
    if (status !== "authenticated" || !isLedgerAdmin) return;
    try {
      const r = await fetch("/api/owner-activity");
      if (r.ok) setPayload(await r.json());
      else setPayload(null);
    } catch {
      setPayload(null);
    }
  }, [status, isLedgerAdmin]);

  useEffect(() => {
    if (status !== "authenticated" || !isLedgerAdmin) {
      setPayload(null);
      return;
    }
    load();
    const t = setInterval(load, 45000);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", load);
    };
  }, [status, isLedgerAdmin, load]);

  useEffect(() => {
    try {
      setLastPostedDate(localStorage.getItem("phl_linkedin_last_posted_date") || "");
    } catch {}
  }, []);

  const dismiss = async () => {
    setDismissing(true);
    try {
      const r = await fetch("/api/owner-activity", { method: "POST" });
      if (r.ok) {
        const j = await r.json();
        setPayload({
          newCount: 0,
          items: [],
          dismissed_max_issue: j.dismissed_max_issue ?? 0,
          max_issue_in_repo: j.dismissed_max_issue ?? 0,
        });
      }
    } catch {
      /* ignore */
    }
    setDismissing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(BLOG_POST_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkPosted = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    try {
      localStorage.setItem("phl_linkedin_last_posted_date", todayStr);
      setLastPostedDate(todayStr);
    } catch {}
  };

  if (status !== "authenticated" || !isLedgerAdmin) {
    return null;
  }

  // LinkedIn Campaign Dates logic:
  // Starts June 1, 2026, active for 45 days. Ends July 15, 2026.
  const now = new Date();
  const campaignStart = new Date("2026-06-01T00:00:00");
  const diffTime = now.getTime() - campaignStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const isCampaignActive = diffDays >= 0 && diffDays < 45;
  // Preview mode: active during May 2026
  const isCampaignPreview = now.getFullYear() === 2026 && now.getMonth() === 4;
  const activeDay = diffDays + 1;

  const todayStr = now.toISOString().split("T")[0];
  const alreadyPostedToday = lastPostedDate === todayStr;

  const showReminder = (isCampaignActive || isCampaignPreview) && !alreadyPostedToday;
  const hasNewVotes = payload && payload.newCount > 0;

  if (!hasNewVotes && !showReminder) {
    return null;
  }

  const { newCount, items } = payload || { newCount: 0, items: [] };
  const sample = items.slice(0, 3);
  const sampleText =
    sample.length > 0
      ? ` (${sample
          .map((it) => `#${it.issue} ${it.vote === "yes" ? "vouch" : "flag"}`)
          .join(", ")}).`
      : ".";

  return (
    <aside 
      className="owner-activity-strip" 
      role="status" 
      aria-live="polite"
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
      {hasNewVotes && (
        <div className="owner-activity-strip-inner" style={{ width: '100%' }}>
          <p className="owner-activity-strip-msg">
            <strong>New on the ledger:</strong>{" "}
            {newCount} new vote{newCount === 1 ? "" : "s"} since you last checked
            {sampleText}
          </p>
          <div className="owner-activity-strip-actions">
            <Link href="/transparency" className="owner-activity-strip-link">
              Audit trail
            </Link>
            <Link href="/admin/moderate" className="owner-activity-strip-link">
              Moderate
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm owner-activity-strip-dismiss"
              disabled={dismissing}
              onClick={dismiss}
            >
              {dismissing ? "…" : "Mark seen"}
            </button>
          </div>
        </div>
      )}

      {showReminder && (
        <div 
          className="owner-activity-strip-inner" 
          style={{ 
            borderTop: hasNewVotes ? '1px solid #d97706' : 'none', 
            paddingTop: hasNewVotes ? '10px' : '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '12px'
          }}
        >
          <p className="owner-activity-strip-msg" style={{ margin: 0, color: '#78350f' }}>
            <strong>{isCampaignPreview ? "📢 LinkedIn Campaign (Preview):" : `📢 LinkedIn Campaign (Day ${activeDay} of 45):`}</strong>{" "}
            {isCampaignPreview 
              ? "The 45-day LinkedIn story publishing campaign starts automatically on June 1st, 2026." 
              : "Remember to publish the Professional-Health-Ledger story today!"}
          </p>
          <div className="owner-activity-strip-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopy}
              style={{
                background: copied ? '#10b981' : '#b45309',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {copied ? "Copied! ✓" : "Copy Post"}
            </button>
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: '#0077b5',
                color: 'white',
                textDecoration: 'none',
                fontWeight: 'bold',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              Go to LinkedIn
            </a>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleMarkPosted}
              style={{
                background: '#4b5563',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Done Today
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
