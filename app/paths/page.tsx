"use client";

import PathHistoryList from "@/components/PathHistoryList";
import { PathHistoryListSkeleton } from "@/components/ui/PathHistoryListSkeleton";
import type { PathSummary } from "@/domain/types";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

export default function PathsPage() {
  const [paths, setPaths] = useState<PathSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/paths");
        const json = await res.json();
        if (!cancelled) setPaths(json.data ?? []);
      } catch (err) {
        console.error("Failed to fetch paths:", err);
        if (!cancelled) setPaths([]);
      }
    }

    void load();

    // Revalidate when the tab regains focus so progress made in the player is
    // reflected without a manual refresh.
    const refresh = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
      <main className="mx-auto min-h-[calc(100dvh-64px)] w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="page-header mb-6 pb-4 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="page-title text-2xl sm:text-3xl font-bold mb-2">Your learning routes</h1>
            <p className="page-subtitle text-base text-[var(--text-dim)]">
              Here are the learning routes you have generated.
            </p>
          </div>
          <Link href="/" className="btn btn--route whitespace-nowrap self-start sm:self-center text-sm px-4 py-2 transition-all duration-200 hover:scale-105 active:scale-95">
            Create new route
            <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:rotate-90">+</span>
          </Link>
        </div>
      </div>
      <Suspense fallback={<PathHistoryListSkeleton />}>
        {paths ? <PathHistoryList paths={paths} /> : <PathHistoryListSkeleton />}
      </Suspense>
    </main>
  );
}