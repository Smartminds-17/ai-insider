"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import SignInButton from "./SignInButton";
import SignOutButton from "./SignOutButton";

export default function Header() {
  const { data: session, status } = useSession();

  // Presence tracking: update online status every 4 minutes
  useEffect(() => {
    if (status !== "authenticated") return;

    const heartbeat = async () => {
      try {
        await fetch("/api/users/presence", { method: "POST" });
      } catch (err) {
        console.error("Failed to update presence:", err);
      }
    };

    // Initial ping on mount
    heartbeat();
    
    // Set up interval to ping every 4 minutes (240000ms) - before 5-minute offline threshold
    const interval = setInterval(heartbeat, 240000);

    // Mark user as offline when they leave the page
    const handleBeforeUnload = () => {
      navigator.sendBeacon("/api/users/presence", JSON.stringify({ isOnline: false }));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [status]);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[var(--ink)]/95 backdrop-blur supports-[backdrop-filter:bg-[var(--ink)]/80]">
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
        <Link
          href="/chat"
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition hidden sm:inline font-light tracking-tight"
        >
          Messages
        </Link>
        <Link
          href="/mentors"
          className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition hidden sm:inline font-light tracking-tight"
        >
          Mentors
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