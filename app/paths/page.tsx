"use client";

import PathHistoryList from "@/components/PathHistoryList";
import { PathHistoryListSkeleton } from "@/components/ui/PathHistoryListSkeleton";
import type { PathSummary } from "@/domain/types";
import { Suspense, useEffect, useState } from "react";

export default function PathsPage() {
  const [paths, setPaths] = useState<PathSummary[] | null>(null);

  useEffect(() => {
    async function fetchPaths() {
      try {
        const res = await fetch("/api/paths");
        const json = await res.json();
        setPaths(json.data ?? []);
      } catch (err) {
        console.error("Failed to fetch paths:", err);
        setPaths([]);
      }
    }
    fetchPaths();
  }, []);

  return (
    <main className="page-container">
      <div className="page-header">
        <h1 className="page-title">Your learning routes</h1>
        <p className="page-subtitle">
          Here are the learning routes you have generated.
        </p>
      </div>
      <Suspense fallback={<PathHistoryListSkeleton />}>
        {paths ? <PathHistoryList paths={paths} /> : <PathHistoryListSkeleton />}
      </Suspense>
    </main>
  );
}