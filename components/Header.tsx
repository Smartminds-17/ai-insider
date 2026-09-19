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
        {/* Design-only: routes-used counter (free-tier usage, future billing).
            Order below — routes, Paths, messages, avatar — matches the
            "ai-insider" Figma frame (node 2019:85). */}
        {/* <span
          className="text-sm text-[var(--text-dim)] font-light tracking-tight hidden sm:inline"
          data-usage-slot
        >
          2/3 Routes
        </span> */}
        <Link
          href="/paths"
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition hidden sm:inline font-light tracking-tight"
        >
          Paths
        </Link>
        {/* <Link
          href="/pricing"
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition hidden sm:inline"
        >
          Pricing
        </Link> */}

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
                className="w-8 h-8 rounded-full ring-2 ring-white/10"
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
