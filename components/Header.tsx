"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import SignInButton from "./SignInButton";
import SignOutButton from "./SignOutButton";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
      <Link href="/" className="font-mono text-xs tracking-widest uppercase text-[var(--route)]">
        AI Insider
      </Link>
      <div className="flex items-center gap-5">
        <Link
          href="/paths"
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition hidden sm:inline"
        >
          My Paths
        </Link>
        {/* Design-only: Usage meter chip slot (for free-tier users, future billing) */}
        <span className="chip chip--ink hidden sm:inline-flex" data-usage-slot>
          <span className="legend-label legend-label--dim">2/3 routes</span>
        </span>
        <Link
          href="/pricing"
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition hidden sm:inline"
        >
          Pricing
        </Link>
        {status === "loading" ? (
          <span className="text-xs text-[var(--text-dim)]">Loading...</span>
        ) : session?.user ? (
          <div className="flex items-center gap-3">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={32}
                height={32}
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