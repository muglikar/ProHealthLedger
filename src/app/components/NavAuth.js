"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

const ADMIN_IDS = new Set(["github:muglikar"]);

export default function NavAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="nav-auth-loading">…</span>;
  }

  if (!session) {
    return (
      <button className="nav-auth-btn" onClick={() => signIn()}>
        Sign In
      </button>
    );
  }

  const isAdmin = ADMIN_IDS.has(session.userId);

  return (
    <div className="nav-auth-user">
      {isAdmin && (
        <Link href="/admin/moderate" className="nav-admin-link">
          Moderate
        </Link>
      )}
      <span
        className="nav-auth-name"
        title={session.userId ? `Account: ${session.userId}` : ""}
      >
        {session.displayName || session.userId}
      </span>
      <button
        className="nav-auth-btn nav-auth-btn-out"
        onClick={() => signOut()}
      >
        Sign Out
      </button>
    </div>
  );
}
