"use client";

import PathHistoryList from "@/components/PathHistoryList";
import FeatureStatusBanner from "@/components/ui/FeatureStatusBanner";
import type { PathSummary } from "@/domain/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PathsPage() {
  const [paths, setPaths] = useState<PathSummary[] | null>(null);

  // Fetch paths once on mount
  useEffect(() => {
    const fetchPaths = async () => {
      try {
        const res = await fetch("/api/paths");
        const json = await res.json();
        setPaths(json.data ?? []);
      } catch (err) {
        console.warn("Failed to fetch paths:", err);
      }
    };
    fetchPaths();
  }, []);

  // Poll for updates only when there are generating paths
  useEffect(() => {
    if (!paths) return;
    const hasGeneratingPaths = paths.some(path => path.status === "GENERATING");
    if (!hasGeneratingPaths) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/paths");
        const json = await res.json();
        setPaths(json.data ?? []);
      } catch (err) {
        console.warn("Failed to fetch paths, will retry:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [paths]);

  if (!paths) {
    return (
      <main className="flex-1 px-5 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-3xl font-medium mb-10">Your learning routes</h1>
          <p className="font-mono text-sm text-[var(--text-dim)] animate-pulse">Loading your routes…</p>
        </div>
      </main>
    );
  }
  return (
    <main className="flex-1 px-5 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <FeatureStatusBanner
          status="info"
          message="Path Building is currently in beta. You may experience some issues."
        />
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="legend-label legend-label--route">Your learning</span>
          <span className="chip chip--ink">
            <span className="chip__dot" />
            {paths.length} route{paths.length === 1 ? "" : "s"} mapped
          </span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-medium leading-tight mb-2">
              Your learning routes
            </h1>
            <p className="text-[var(--text-dim)] max-w-xl leading-relaxed">
              Pick up where you left off, or open a route to choose your next lesson.
            </p>
          </div>
          <Link
            href="/"
            className="btn btn--route"
          >
            Map new route →
          </Link>
        </div>

        <PathHistoryList 
          paths={paths} 
          onDelete={(deletedId) => {
            // Remove the deleted path from local state to refresh the list
            setPaths(paths.filter(path => path.id !== deletedId));
          }} 
        />
      </div>
    </main>
  );
}