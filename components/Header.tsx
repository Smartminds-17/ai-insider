"use client";

import { useSession } from "next-auth/react";
import SignInButton from "./SignInButton";
import SignOutButton from "./SignOutButton";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <a href="/" className="font-mono text-xs tracking-widest uppercase text-[var(--route)]">
        AI Insider
      </a>
      <div className="flex items-center gap-3">
        {status === "loading" ? (
          <span className="text-xs text-[var(--text-dim)]">Loading...</span>
        ) : session?.user ? (
          <div className="flex items-center gap-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name ?? "User"}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-[var(--text-dim)] hidden sm:inline">
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        ) : (
          <SignInButton />
        )}
      </div>
    </header>
  );
}