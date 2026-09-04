"use client";

import PathHistoryList from "@/components/PathHistoryList";
import type { PathSummary } from "@/domain/types";
import { useEffect, useState } from "react";

export default function PathsPage() {
  const [paths, setPaths] = useState<PathSummary[] | null>(null);

  // Fetch paths on component mount
  useEffect(() => {
    fetch("/api/paths")
      .then((res) => res.json())
      .then((json) => setPaths(json.data ?? []))
      .catch(() => setPaths([]));
  }, []);

  // Handle deletion - remove the deleted path from local state
  function handleDelete(id: string) {
    setPaths((prev) => prev ? prev.filter((p) => p.id !== id) : []);
  }

  if (!paths) {
    return (
      <main className="flex-1 px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-medium mb-10">Your Routes</h1>
          <p className="font-mono text-sm text-[var(--text-dim)] animate-pulse">Loading your routes…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-medium mb-10">Your Routes</h1>
        <PathHistoryList paths={paths} onDelete={handleDelete} />
      </div>
    </main>
  );
}