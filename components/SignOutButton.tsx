"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-[var(--text)] hover:border-white/30 hover:bg-white/5 transition text-sm"
    >
      Sign out
    </button>
  );
}