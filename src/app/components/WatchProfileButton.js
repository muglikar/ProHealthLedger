"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function WatchProfileButton({ slug, style }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      try {
        const watched = JSON.parse(localStorage.getItem("phl_watched_slugs") || "[]");
        setIsWatching(watched.includes(slug));
      } catch {}
    }
  }, [slug]);

  const handleWatch = async () => {
    if (!isSupported) return;
    setLoading(true);

    try {
      if (isWatching) {
        // Unwatch
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/watch-profile", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              profileSlug: slug,
            }),
          });
        }
        
        try {
          const watched = JSON.parse(localStorage.getItem("phl_watched_slugs") || "[]");
          const updated = watched.filter((s) => s !== slug);
          localStorage.setItem("phl_watched_slugs", JSON.stringify(updated));
        } catch {}
        
        setIsWatching(false);
      } else {
        // Watch
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          alert("Notification permission is required to watch profiles.");
          setLoading(false);
          return;
        }

        const registration = await navigator.serviceWorker.register("/service-worker.js");
        
        const keyRes = await fetch("/api/push-public-key");
        const keyData = await keyRes.json();
        if (!keyData.publicKey) {
          alert("Web push is not configured on the server yet.");
          setLoading(false);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });

        await fetch("/api/watch-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription,
            profileSlug: slug,
          }),
        });

        try {
          const watched = JSON.parse(localStorage.getItem("phl_watched_slugs") || "[]");
          if (!watched.includes(slug)) {
            watched.push(slug);
            localStorage.setItem("phl_watched_slugs", JSON.stringify(watched));
          }
        } catch {}

        setIsWatching(true);
      }
    } catch (err) {
      console.error("Failed to update watcher status:", err);
      alert("Something went wrong while setting up profile watch.");
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported || !slug) return null;

  return (
    <button
      type="button"
      className={`watch-profile-btn${isWatching ? " is-watching" : ""}`}
      onClick={handleWatch}
      disabled={loading}
      style={style}
      title={isWatching ? "Stop watching this profile for updates" : "Watch this profile for updates"}
    >
      <svg
        viewBox="0 0 24 24"
        fill={isWatching ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span>{isWatching ? "Watching" : "Watch Profile"}</span>
    </button>
  );
}
