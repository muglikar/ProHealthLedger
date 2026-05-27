"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function VerificationBadgeModal({ profileSlug, publicName, onClose }) {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);

  const profileUrl = `https://prohealthledger.org/p/directory/directory/${encodeURIComponent(profileSlug)}`;
  
  const embedHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; font-family: -apple-system, system-ui, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 10px 20px; border-radius: 999px; text-decoration: none; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4); border: 1px solid rgba(255,255,255,0.2);">
  <span style="margin-right: 6px; font-size: 15px;">💎</span> Verified Professional on Pro-Health Ledger
</a>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy", e);
    }
  };

  const handlePostToLinkedIn = async () => {
    setPosting(true);
    setPostResult(null);
    try {
      const res = await fetch("/api/share-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "badge",
          commentary: "I'm proud to be recognized as a Verified Professional on the Professional Health Ledger. Transparency and accountability matter!",
          articleUrl: profileUrl,
          articleTitle: `${publicName || "Verified Professional"} on Pro-Health Ledger`,
          articleDescription: "See verified professional vouches and community trust on Pro-Health Ledger.",
          cleanVouchee: publicName || "Verified Professional",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post");
      }
      setPostResult({ ok: true });
    } catch (e) {
      setPostResult({ ok: false, error: e.message });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="share-modal-backdrop" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Claim Your Verification Badge</h3>
          <button className="share-modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="share-modal-body">
          <p style={{ marginBottom: "15px", color: "#64748b" }}>
            You have verified community vouches! Add this badge to your personal website, or post it to your LinkedIn feed to build trust and authority.
          </p>

          {!session ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <button 
                className="btn btn-primary"
                onClick={() => signIn("linkedin")}
                style={{ width: "100%", background: "#0a66c2", borderColor: "#0a66c2", padding: "12px", fontSize: "16px" }}
              >
                Sign in with LinkedIn to Claim
              </button>
            </div>
          ) : (
            <>
              <div style={{ padding: "20px", textAlign: "center", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "15px" }}>
                <div dangerouslySetInnerHTML={{ __html: embedHtml }} />
              </div>

              <textarea 
                readOnly 
                value={embedHtml} 
                style={{ width: "100%", height: "100px", padding: "10px", fontFamily: "monospace", fontSize: "14px", backgroundColor: "#f8fafc", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: "4px", marginBottom: "15px" }}
              />
              
              <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                <button 
                  onClick={handleCopy}
                  className="btn btn-outline"
                  style={{ width: "100%" }}
                >
                  {copied ? "Copied to Clipboard!" : "Copy Embed Code"}
                </button>
                <button 
                  onClick={handlePostToLinkedIn}
                  className="btn btn-primary"
                  disabled={posting || postResult?.ok}
                  style={{ width: "100%", background: "#0a66c2", borderColor: "#0a66c2" }}
                >
                  {posting ? "Posting..." : postResult?.ok ? "Posted to LinkedIn!" : "Post Badge to LinkedIn"}
                </button>
                {postResult?.error && (
                  <div style={{ color: "#ef4444", fontSize: "0.85rem", textAlign: "center", marginTop: "4px" }}>
                    {postResult.error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
