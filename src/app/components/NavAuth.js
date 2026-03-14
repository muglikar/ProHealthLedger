"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function NavAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="nav-auth-loading">…</span>;
  }

  if (!session) {
    return (
      <button className="nav-auth-btn" onClick={() => signIn("github")}>
        Sign In
      </button>
    );
  }

  return (
    <div className="nav-auth-user">
      <span className="nav-auth-name">@{session.username}</span>
      <button
        className="nav-auth-btn nav-auth-btn-out"
        onClick={() => signOut()}
      >
        Sign Out
      </button>
    </div>
  );
}
