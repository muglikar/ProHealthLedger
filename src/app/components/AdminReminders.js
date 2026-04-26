"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { isRepoMaintainerUserId } from "@/lib/repo-owner-session";

/**
 * Admin-only reminder banners. Each reminder has an ID, a date after which
 * it should appear, and a message. Dismissed reminders are stored in
 * localStorage so they don't reappear.
 */
const REMINDERS = [
  {
    id: "verified-on-linkedin-check-2026-05-06",
    showAfter: "2026-05-06",
    message:
      "Reminder: Check if "Verified on LinkedIn" has been approved in the LinkedIn Developer Portal. " +
      "Once approved, the /identityMe endpoint will allow sureshot identity mapping for 1st-person vouch sharing.",
    link: "https://www.linkedin.com/developers/apps",
    linkLabel: "Open Developer Portal",
  },
];

const LS_KEY = "phl_dismissed_reminders";

function getDismissed() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function dismissReminder(id) {
  const list = getDismissed();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }
}

export default function AdminReminders() {
  const { data: session, status } = useSession();
  const [dismissed, setDismissed] = useState([]);
  const [mounted, setMounted] = useState(false);

  const isAdmin =
    Boolean(session?.siteAdmin) ||
    (session?.userId ? isRepoMaintainerUserId(session.userId) : false);

  useEffect(() => {
    setMounted(true);
    setDismissed(getDismissed());
  }, []);

  if (!mounted || status !== "authenticated" || !isAdmin) return null;

  const today = new Date().toISOString().slice(0, 10);
  const active = REMINDERS.filter(
    (r) => today >= r.showAfter && !dismissed.includes(r.id)
  );

  if (active.length === 0) return null;

  return (
    <>
      {active.map((r) => (
        <aside
          key={r.id}
          className="admin-reminder-strip"
          role="status"
          aria-live="polite"
        >
          <div className="admin-reminder-inner">
            <span className="admin-reminder-icon">🔔</span>
            <p className="admin-reminder-msg">{r.message}</p>
            <div className="admin-reminder-actions">
              {r.link && (
                <a
                  href={r.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-reminder-link"
                >
                  {r.linkLabel || "Open"}
                </a>
              )}
              <button
                type="button"
                className="admin-reminder-dismiss"
                onClick={() => {
                  dismissReminder(r.id);
                  setDismissed((prev) => [...prev, r.id]);
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </aside>
      ))}
    </>
  );
}
