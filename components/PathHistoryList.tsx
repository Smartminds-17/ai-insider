"use client";

import type { PathSummary } from "@/domain/types";
import Link from "next/link";
import { useState } from "react";

function statusLabel(path: PathSummary): string {
  if (path.status === "GENERATING") return "Building your route";
  if (path.status === "FAILED") return "Could not build route";
  if (path.totalVideos === 0) return "Route ready";
  return `${path.watchedVideos} of ${path.totalVideos} lessons watched`;
}

export default function PathHistoryList({
  paths,
  onDelete,
}: {
  paths: PathSummary[];
  onDelete?: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(event: React.MouseEvent, id: string) {
    event.preventDefault();
    if (deletingId) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/paths/${id}`, { method: "DELETE" });
      if (response.ok) onDelete?.(id);
    } catch (error) {
      console.error("Failed to delete path:", error);
    } finally {
      setDeletingId(null);
    }
  }

  if (paths.length === 0) {
    return (
      <div className="surface-card p-8 text-center sm:p-12">
        <p className="legend-label legend-label--route mb-2">Start with a goal</p>
        <h2 className="font-display mb-2 text-2xl font-medium">Your first route starts here</h2>
        <p className="mx-auto mb-6 max-w-md leading-relaxed text-[var(--text-dim)]">
          Describe what you want to learn and get an ordered route of videos to follow.
        </p>
        <Link href="/" className="btn btn--route">Create a learning route <span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {paths.map((path) => {
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
                  <Link href={`/path/${path.id}`} className="btn btn--route">
                    {ready ? "Continue learning" : path.status === "GENERATING" ? "View progress" : "View route"}
                    <span aria-hidden="true">→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={(event) => handleDelete(event, path.id)}
                    disabled={deletingId === path.id}
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
      })}
    </ul>
  );
}
