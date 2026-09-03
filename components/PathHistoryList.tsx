"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PathSummary } from "@/domain/types";

function statusLabel(status: PathSummary["status"], watched: number, total: number): string {
  if (status === "GENERATING") return "Charting route…";
  if (status === "FAILED") return "Failed to generate";
  if (total === 0) return "No videos yet";
  return `${watched}/${total} watched`;
}

export default function PathHistoryList() {
  const [paths, setPaths] = useState<PathSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/paths")
      .then((res) => res.json())
      .then((json) => setPaths(json.data ?? []))
      .catch(() => setPaths([]));
  }, []);

  if (!paths) {
    return <p className="font-mono text-sm text-[var(--text-dim)] animate-pulse">Loading your routes…</p>;
  }

  if (paths.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-dim)] mb-6">You haven&apos;t mapped any routes yet.</p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-lg bg-[var(--route)] text-[var(--ink)] font-display font-medium hover:brightness-110 transition"
        >
          Map your first route
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {paths.map((path) => {
        const pct = path.totalVideos > 0 ? Math.round((path.watchedVideos / path.totalVideos) * 100) : 0;
        return (
          <li key={path.id}>
            <Link
              href={`/path/${path.id}`}
              className="block bg-[var(--ink-2)] border border-white/10 rounded-lg p-4 hover:border-[var(--route)]/50 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-lg truncate">{path.title}</h2>
                  <p className="text-xs text-[var(--text-dim)] mt-1 truncate">{path.prompt}</p>
                </div>
                <span className="font-mono text-xs text-[var(--text-dim)] shrink-0 mt-1">
                  {statusLabel(path.status, path.watchedVideos, path.totalVideos)}
                </span>
              </div>
              {path.status === "READY" && path.totalVideos > 0 && (
                <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: "var(--route)" }}
                  />
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
