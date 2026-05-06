"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function SharePHLButton({ className = "" }) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [shareData, setShareData] = useState(null);

  const handleShareClick = async (e) => {
    e.preventDefault();
    if (status !== "authenticated") {
      // If not logged in, just show the general homepage link or send to sign in
      window.location.href = "/submit";
      return;
    }

    setLoading(true);
    try {
      // First, check if they already have a general referral link
      const res = await fetch("/api/referrals");
      const referrals = await res.json();
      let general = Array.isArray(referrals) ? referrals.find(r => r.profile_slug === "__home__") : null;

      if (!general) {
        // Generate it on the fly
        const createRes = await fetch("/api/referrals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileSlug: "__home__",
            profileName: "ProHealthLedger Homepage",
          }),
        });
        general = await createRes.json();
      }

      setShareData({
        url: general.shareUrl || `${window.location.origin}/?ref=${general.refCode || general.ref_code}`,
        text: general.linkedinText || "Check out ProHealthLedger — a verified professional directory for honest experiences.",
        linkedin: general.linkedinShareUrl
      });
      setShowModal(true);
    } catch (err) {
      console.error("Failed to prepare share link:", err);
      alert("Could not prepare your referral link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleShareClick}
        className={`share-phl-nav-btn ${className}`}
        disabled={loading}
      >
        {loading ? "..." : "Share PHL"}
      </button>

      {showModal && shareData && (
        <div className="share-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Share ProHealthLedger</h3>
            <p>Your unique referral link is ready! Signups via this link build your scientific track record.</p>
            
            <div className="share-link-input-group">
              <input 
                readOnly 
                value={shareData.url} 
                onClick={(e) => e.target.select()}
              />
              <button onClick={() => {
                navigator.clipboard.writeText(shareData.url);
                alert("Copied!");
              }}>Copy</button>
            </div>

            <div className="share-actions-grid">
              <a 
                href={shareData.linkedin || `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-social-btn linkedin"
              >
                Post on LinkedIn
              </a>
              <a 
                href={`https://wa.me/?text=${encodeURIComponent(shareData.text + "\n\n" + shareData.url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="share-social-btn whatsapp"
              >
                Share on WhatsApp
              </a>
            </div>

            <button className="share-modal-close" onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .share-phl-nav-btn {
          padding: 6px 14px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: transform 0.1s;
          white-space: nowrap;
        }
        .share-phl-nav-btn:hover {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
        .share-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }
        .share-modal-content {
          background: var(--bg-card);
          padding: 32px;
          border-radius: 12px;
          max-width: 450px;
          width: 90%;
          border: 1px solid var(--border);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .share-modal-content h3 { margin-top: 0; color: var(--accent); }
        .share-modal-content p { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 24px; }
        
        .share-link-input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }
        .share-link-input-group input {
          flex: 1;
          padding: 10px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 0.85rem;
        }
        .share-link-input-group button {
          padding: 0 16px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        .share-actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }
        .share-social-btn {
          padding: 12px;
          text-align: center;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.9rem;
          color: white;
        }
        .share-social-btn.linkedin { background: #0077b5; }
        .share-social-btn.whatsapp { background: #25d366; }
        
        .share-modal-close {
          width: 100%;
          padding: 10px;
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
