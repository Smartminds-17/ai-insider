"use client";

import type { PathSummary } from "@/domain/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PathHistoryListItemProps {
  path: PathSummary;
  onDelete: (id: string) => void;
}

export default function PathHistoryListItem({ path: initialPath, onDelete }: PathHistoryListItemProps) {
  const [path, setPath] = useState<PathSummary>(initialPath);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Poll only this specific path if it's still generating
  useEffect(() => {
    if (path.status !== "GENERATING") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/paths/${path.id}`);
        if (res.ok) {
          const updatedPath = await res.json();
          setPath(updatedPath.data);
          if (updatedPath.data.status !== "GENERATING") {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch path ${path.id}:`, err);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [path.status, path.id]);

  async function handleDelete(event: React.MouseEvent, id: string) {
    event.preventDefault();
    if (deletingId) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/paths/${id}`, { method: "DELETE" });
      if (response.ok) onDelete(id);
    } catch (error) {
      console.error("Failed to delete path:", error);
    } finally {
      setDeletingId(null);
    }
  }

  function statusLabel(path: PathSummary): string {
    if (path.status === "GENERATING") return "Building your route";
    if (path.status === "FAILED") return "Could not build route";
    if (path.totalVideos === 0) return "Route ready";
    return `${path.watchedVideos} of ${path.totalVideos} lessons watched`;
  }

  const progress = path.totalVideos > 0
    ? Math.round((path.watchedVideos / path.totalVideos) * 100)
    : 0;
  const ready = path.status === "READY";

  return (
    <li key={path.id}>
      <article className="surface-card p-5 transition hover:border-white/20 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`chip ${ready ? "chip--sage" : path.status === "FAILED" ? "chip--ink" : "chip--route"}`}>
                <span className="chip__dot" />
                {path.status === "GENERATING" && (
                  <Loader2 className="inline-block w-3 h-3 mr-1 animate-spin" />
                )}
                {path.status === "GENERATING" ? "Building" : path.status === "FAILED" ? "Needs attention" : "Learning route"}
              </span>
              <span className="text-xs text-[var(--text-dim)]">{statusLabel(path)}</span>
            </div>
            <Link href={`/path/${path.id}`} className="group block">
              <h2 className="font-display truncate text-lg font-medium transition group-hover:text-[var(--route)] sm:text-xl">
                {path.title}
              </h2>
              <p className="mt-1 max-w-2xl truncate text-sm text-[var(--text-dim)]">{path.prompt}</p>
            </Link>
            {ready && path.totalVideos > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-label={`Progress in ${path.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div className="h-full rounded-full bg-[var(--route)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="font-mono text-xs text-[var(--text-dim)]">{progress}%</span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-white/10 pt-4 sm:border-0 sm:pt-0">
            <Link 
              href={`/path/${path.id}`} 
              className={`btn btn--route ${path.status === "GENERATING" ? "opacity-70 pointer-events-none" : ""}`}
            >
              {ready ? "Continue learning" : path.status === "GENERATING" ? "Building..." : "View route"}
              <span aria-hidden="true">→</span>
            </Link>
            <button
              type="button"
              onClick={(event) => handleDelete(event, path.id)}
              disabled={deletingId === path.id || path.status === "GENERATING"}
              className="btn btn--ink px-3 text-[var(--text-dim)] disabled:opacity-50"
              aria-label={`Delete ${path.title}`}
              title="Delete route"
            >
              {deletingId === path.id ? "…" : "Delete"}
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}