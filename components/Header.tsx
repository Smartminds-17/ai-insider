"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SignInButton from "./SignInButton";
import SignOutButton from "./SignOutButton";

interface UserTier {
  name: string;
  chipClass: string;
  isFree: boolean;
}

export default function Header({ userTier }: { userTier: UserTier }) {
  const { data: session, status } = useSession();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Keep --header-h in sync with the real rendered header. The bar wraps to two
  // rows on small screens (and its height shifts when the session resolves), so
  // the sticky player cannot rely on a hard-coded offset.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const apply = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${Math.round(el.getBoundingClientRect().height)}px`
      );
    };

    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
    <header ref={headerRef} className="sticky top-0 z-[var(--z-header)] flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[var(--border-subtle)] bg-[var(--ink)]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter:bg-[var(--ink)]/80] sm:px-6">
      <Link href="/" className="font-mono text-xs tracking-widest uppercase text-[var(--route)]">
        AI Insider
      </Link>
      <nav aria-label="Main navigation" className="order-3 flex w-full items-center gap-5 overflow-x-auto border-t border-white/5 pt-2 sm:order-none sm:w-auto sm:border-0 sm:pt-0">
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
          className="shrink-0 text-xs font-light tracking-tight text-[var(--text-dim)] transition hover:text-[var(--route)] sm:text-sm"
        >
          Paths
        </Link>
        <Link
          href="/chat"
          className="shrink-0 text-xs font-light tracking-tight text-[var(--text-dim)] transition hover:text-[var(--route)] sm:text-sm"
        >
          Messages
        </Link>
        <Link
          href="/mentors"
          className="shrink-0 text-xs font-light tracking-tight text-[var(--text-dim)] transition hover:text-[var(--route)] sm:text-sm"
        >
          Mentors
        </Link>
        <Link
          href="/pricing"
          className="shrink-0 text-xs font-light tracking-tight text-[var(--text-dim)] transition hover:text-[var(--route)] sm:text-sm"
        >
          Pricing
        </Link>
      </nav>

        {status === "loading" ? (
          <span className="text-xs text-[var(--text-dim)]">Loading...</span>
        ) : session?.user ? (
          <div className="relative flex items-center gap-3">
            {/* Account tier badge - matches ChatGPT's tier display pattern */}
            <span 
              className={`chip ${userTier.chipClass} hidden sm:inline-flex items-center gap-1.5 text-xs px-2 py-0.5`}
              aria-label={`Current plan: ${userTier.name}`}
            >
              <span className="chip__dot" />
              {userTier.name}
            </span>
            
            {/* User profile click area to open dropdown */}
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--route)] rounded-full"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
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
              {/* Dropdown arrow */}
              <svg 
                className={`w-4 h-4 text-[var(--text-dim)] transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu - only appears when clicked */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-[var(--surface-1)] border border-white/10 shadow-lg overflow-hidden">
                <div className="p-2">
                  <div className="px-3 py-2">
                    <p className="text-xs text-[var(--text-dim)]">{session.user.email}</p>
                  </div>
                  <hr className="border-white/5 my-1" />
                  <SignOutButton compact />
                </div>
              </div>
            )}
          </div>
        ) : (
          <SignInButton />
        )}
    </header>
  );
}