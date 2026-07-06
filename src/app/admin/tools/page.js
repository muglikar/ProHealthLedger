"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";

export default function AdminToolsPage() {
  const { data: session, status } = useSession();
  const [missingImages, setMissingImages] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [uploadMethod, setUploadMethod] = useState("file"); // "file" or "url"
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [removingPhoto, setRemovingPhoto] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiError, setAiError] = useState("");

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");

  const [loading, setLoading] = useState(true);

  const isAdmin =
    status === "authenticated" &&
    session?.userId &&
    (Boolean(session.siteAdmin) || isRepoMaintainerUserId(session.userId));

  const fetchMissingImages = useCallback(async (showAll = showAllProfiles) => {
    try {
      const res = await fetch(`/api/admin/profiles-missing-images?all=${showAll}`);
      if (res.ok) {
        const data = await res.json();
        setMissingImages(data);
        if (data.length > 0) {
          setSelectedSlug(prev => data.some(d => d.slug === prev) ? prev : data[0].slug);
        } else {
          setSelectedSlug("");
        }
      }
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    }
  }, [showAllProfiles]);

  const fetchSystemLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const res = await fetch("/api/admin/system-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setLogsError(errData.error || "Failed to fetch activity reports.");
      }
    } catch (err) {
      setLogsError("Failed to fetch activity reports.");
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetchMissingImages(showAllProfiles),
      fetchSystemLogs()
    ]).finally(() => setLoading(false));
  }, [isAdmin, showAllProfiles, fetchMissingImages, fetchSystemLogs]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (uploadMethod === "file" && !imagePreview) {
      setUploadError("Please select an image file.");
      return;
    }
    if (uploadMethod === "url" && !imageUrl.trim()) {
      setUploadError("Please enter an image URL.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const payload = { slug: selectedSlug };
      if (uploadMethod === "url") {
        payload.imageUrl = imageUrl.trim();
      } else {
        payload.imageData = imagePreview;
      }

      const res = await fetch("/api/admin/upload-profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save image.");
      }

      setUploadSuccess(`Successfully saved image for ${selectedSlug}!`);
      setImageFile(null);
      setImagePreview("");
      setImageUrl("");
      await fetchMissingImages();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!selectedSlug) return;
    if (!confirm(`Are you sure you want to remove the profile photo for ${selectedSlug}?`)) {
      return;
    }

    setRemovingPhoto(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const res = await fetch("/api/admin/remove-profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selectedSlug }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove image.");
      }

      setUploadSuccess(`Successfully removed image for ${selectedSlug}!`);
      await fetchMissingImages();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setRemovingPhoto(false);
    }
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError("");
    setAiResponse("");

    try {
      const res = await fetch("/api/admin/suggest-code-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get suggestions.");
      }

      setAiResponse(data.response);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="empty-state"><p>Loading…</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <h3>Access denied</h3>
        <p>This page is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div className="page-header" style={{ marginBottom: "32px" }}>
        <h1>Admin System Tools</h1>
        <p>Manage missing profile images and query the AI coding assistant directly.</p>
      </div>

      {/* Profile Image Uploader */}
      <section style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "var(--radius)", marginBottom: "32px", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "16px", color: "var(--text)" }}>
          📸 Upload Profile Images
        </h2>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Select a profile that is missing a photo, upload an image file or fetch from a URL, and save it locally in the repository.
        </p>

        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            <input
              type="checkbox"
              checked={showAllProfiles}
              onChange={(e) => setShowAllProfiles(e.target.checked)}
            />
            Show all profiles (allow changing existing photos)
          </label>
        </div>

        {missingImages.length === 0 ? (
          <div style={{ padding: "16px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "var(--radius-sm)", color: "var(--accent)" }}>
            <strong>✓ All profiles have local images!</strong> No placeholders left.
          </div>
        ) : (
          <form onSubmit={handleUpload}>
            {uploadError && <div className="form-error" style={{ marginBottom: "16px" }}>{uploadError}</div>}
            {uploadSuccess && <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.1)", color: "var(--success)", borderRadius: "var(--radius-sm)", marginBottom: "16px", fontSize: "0.9rem" }}>{uploadSuccess}</div>}

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="profile-select">Select Profile</label>
              <select
                id="profile-select"
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text)" }}
              >
                {missingImages.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.public_name} ({p.slug})
                  </option>
                ))}
              </select>
             </div>

            {(() => {
              const selectedProfile = missingImages.find((p) => p.slug === selectedSlug);
              if (selectedProfile && selectedProfile.profile_photo_url && !selectedProfile.profile_photo_url.includes("placeholder")) {
                return (
                  <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", background: "var(--bg)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <img
                      src={selectedProfile.profile_photo_url}
                      alt={selectedProfile.public_name}
                      style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }}
                    />
                    <div>
                      <p style={{ margin: 0, fontWeight: "600", fontSize: "0.9rem", color: "var(--text)" }}>Current Photo</p>
                      <p style={{ margin: "2px 0 8px 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Storage: {selectedProfile.photo_storage || "unknown"}
                      </p>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={removingPhoto}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.8rem",
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          fontWeight: "600",
                          transition: "opacity 0.2s"
                        }}
                      >
                        {removingPhoto ? "Removing..." : "Remove Photo"}
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label>Image Source</label>
              <div style={{ display: "flex", gap: "16px", marginBottom: "12px", marginTop: "6px" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9rem" }}>
                  <input
                    type="radio"
                    name="uploadMethod"
                    value="file"
                    checked={uploadMethod === "file"}
                    onChange={() => setUploadMethod("file")}
                  />
                  Upload File
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.9rem" }}>
                  <input
                    type="radio"
                    name="uploadMethod"
                    value="url"
                    checked={uploadMethod === "url"}
                    onChange={() => setUploadMethod("url")}
                  />
                  Paste Image URL
                </label>
              </div>
            </div>

            {uploadMethod === "file" ? (
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label htmlFor="image-file">Choose Image File</label>
                <input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "block", width: "100%", padding: "8px 0" }}
                />
                {imagePreview && (
                  <div style={{ marginTop: "12px" }}>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Preview:</p>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label htmlFor="image-url">Image URL</label>
                <input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
                  required={uploadMethod === "url"}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || (uploadMethod === "file" ? !imagePreview : !imageUrl.trim())}
            >
              {uploading ? "Saving Image…" : "Save Image"}
            </button>
          </form>
        )}
      </section>

      {/* Activity Logs Section */}
      <section style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "var(--radius)", marginBottom: "32px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "var(--text)" }}>
            ⚙️ Backup & Archiving Activity Reports
          </h2>
          <button
            onClick={fetchSystemLogs}
            disabled={logsLoading}
            style={{
              padding: "6px 12px",
              fontSize: "0.8rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)",
              cursor: "pointer",
              fontWeight: "600",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {logsLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Monitor the automatic weekly backups of database logs and daily archiving checks on Wayback Machine & archive.is.
        </p>

        {logsError && (
          <div className="form-error" style={{ marginBottom: "16px" }}>
            {logsError}
          </div>
        )}

        {logsLoading && logs.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading activity status reports...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", background: "var(--bg)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--border)" }}>
            No status reports found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
            {logs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  padding: "14px",
                  background: "var(--bg)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: "600", color: "var(--text)", fontSize: "0.95rem" }}>
                      {formatActivityName(log.activity || log.code)}
                    </span>
                    {getStatusBadge(log.status || (log.code ? 'error' : null))}
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {log.details && (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                    {log.details}
                  </p>
                )}
                {log.metadata && (
                  <pre style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", background: "rgba(0,0,0,0.05)", padding: "8px", borderRadius: "4px", overflowX: "auto" }}>
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Suggest Code Changes */}
      <section style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "16px", color: "var(--text)" }}>
          💻 AI Code Assistant (Antigravity)
        </h2>
        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Ask the AI pair programmer to suggest code changes or write new features. The suggestions will be displayed here.
        </p>

        <form onSubmit={handleAiSubmit}>
          {aiError && <div className="form-error" style={{ marginBottom: "16px" }}>{aiError}</div>}

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label htmlFor="ai-prompt">Feature Request / Prompt</label>
            <textarea
              id="ai-prompt"
              rows={4}
              placeholder="e.g. Write a new component for a countdown timer or suggest how to style the admin dashboard using glassmorphism."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", resize: "vertical" }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={aiLoading || !aiPrompt.trim()}
          >
            {aiLoading ? "Consulting AI…" : "Suggest Code Changes"}
          </button>
        </form>

        {aiResponse && (
          <div style={{ marginTop: "24px", padding: "20px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "12px", color: "var(--text)" }}>
              🤖 AI Suggested Changes:
            </h3>
            <div style={{ overflowX: "auto", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono, monospace)", fontSize: "0.88rem", lineHeight: "1.6", color: "var(--text)" }}>
              {aiResponse}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatActivityName(act) {
  if (!act) return "System Event";
  if (act === "weekly_backup") return "Weekly Google Drive Backup";
  if (act === "daily_archival") return "Daily Archiving (Wayback & Archive.is)";
  if (act === "OAUTH_CALLBACK_ERROR") return "OAuth Callback Error";
  return String(act).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getStatusBadge(status) {
  if (!status) return null;
  const isSuccess = status === "success";
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "bold",
        backgroundColor: isSuccess ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
        color: isSuccess ? "#10b981" : "#ef4444",
        border: `1px solid ${isSuccess ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
      }}
    >
      {String(status).toUpperCase()}
    </span>
  );
}
