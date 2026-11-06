"use client";

import type { PathSummary } from "@/domain/types";
import { formatRuntime } from "@/lib/formatDuration";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PathHistoryListItemProps {
  path: PathSummary;
  onDelete: (id: string) => void;
}

export default function PathHistoryListItem({ path: initialPath, onDelete }: PathHistoryListItemProps) {
  const [path, setPath] = useState<PathSummary>(initialPath);
  const [deleting, setDeleting] = useState(false);

  // Poll only this specific path if it's still generating. The list endpoint
  // returns the canonical PathSummary shape (progress + resume fields); the
  // detail endpoint returns a full PathView, which would drop them.
  useEffect(() => {
    if (path.status !== "GENERATING") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/paths");
        if (res.ok) {
          const json = (await res.json()) as { data?: PathSummary[] };
          const updatedPath = json.data?.find((candidate) => candidate.id === path.id);
          if (updatedPath) {
            setPath(updatedPath);
            if (updatedPath.status !== "GENERATING") clearInterval(interval);
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
    if (deleting) return;
    if (!window.confirm("Delete this route? Your progress on it will be lost.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/paths/${id}`, { method: "DELETE" });
      if (response.ok) onDelete(id);
    } catch (error) {
      console.error("Failed to delete path:", error);
    } finally {
      setDeleting(false);
    }
  }

  function statusLabel(path: PathSummary): string {
    if (path.status === "GENERATING") return "Building your route";
    if (path.status === "FAILED") return "Could not build route";
    if (path.totalVideos === 0) return "Route ready";
    if (path.progressPercent >= 100) return `All ${path.totalVideos} lessons watched`;
    return `${path.watchedVideos} of ${path.totalVideos} lessons watched`;
  }

  const progress = path.progressPercent;
  const ready = path.status === "READY";
  // Land on the route overview. The player is opened deliberately from the
  // route page's continue-watching bar, never by a deep link on load.
  const openHref = `/path/${path.id}`;
  const started = progress > 0 && progress < 100;
  const actionLabel = !ready
    ? path.status === "GENERATING" ? "Building…" : "View"
    : started ? "Continue" : "Start route";

  const statusChipClass = path.status === "FAILED"
    ? "chip chip--danger"
    : path.status === "GENERATING"
      ? "chip chip--route"
      : "chip chip--ink";

  return (
    <li key={path.id}>
      <article className="surface-card p-4 transition-colors duration-300 ease-out hover:border-white/25 sm:p-5">
        {/* The route is represented by one of its lesson stills, sitting behind
            the Continue action. It fades in from the left and is fully seen at
            the right end — a backdrop, not a clickable thumbnail. */}
        {path.coverThumbnailUrl && (
          <div
            aria-hidden="true"
            className="surface-card__layer pointer-events-none inset-y-0 right-0 w-[70%] sm:w-[58%]"
          >
            <Image
              src={path.coverThumbnailUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 58vw, 70vw"
              className="object-cover object-center"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 30%, #000 78%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 30%, #000 78%)",
              }}
            />
            {/* Ink scrim keeps the copy legible on the left, then clears so
                the still reads at full strength at the right end. */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] from-10% via-[var(--ink)]/60 via-45% to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/70 via-transparent to-[var(--ink)]/20" />
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={statusChipClass}>
                <span className="chip__dot" />
                {path.status === "GENERATING" && (
                  <Loader2 className="inline-block h-3 w-3 animate-spin" aria-hidden="true" />
                )}
                {path.status === "GENERATING"
                  ? "Building"
                  : path.status === "FAILED"
                    ? "Needs attention"
                    : "Learning route"}
              </span>
              <span className="whitespace-nowrap text-xs font-normal text-[var(--text-dim)]">
                {statusLabel(path)}
              </span>
            </div>

            <Link href={openHref} className="group/link block">
              <h2 className="font-display line-clamp-2 text-lg font-medium transition-colors duration-300 group-hover/link:text-[var(--route)] sm:text-xl">
                {path.title}
              </h2>
              <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-[var(--text-dim)]">{path.prompt}</p>
            </Link>

            {ready && path.totalVideos > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-label={`Progress in ${path.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--route)]/50 via-[var(--route)] to-[var(--route)] transition-[width] duration-700 ease-[var(--ease-out)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="whitespace-nowrap font-mono text-xs text-[var(--text-dim)]">
                  {progress}%{path.totalDurationSec > 0 ? ` · ${formatRuntime(path.totalDurationSec)}` : ""}
                </span>
              </div>
            )}
          </div>

          <div className="relative flex shrink-0 items-center gap-2 border-t border-[var(--border-subtle)] pt-3 sm:border-0 sm:pt-0">
            <Link
              href={path.status === "GENERATING" ? `/path/${path.id}` : openHref}
              className={`btn btn--route flex-1 justify-center text-sm sm:flex-none ${path.status === "GENERATING" ? "pointer-events-none opacity-60" : ""}`}
            >
              {actionLabel}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={(event) => handleDelete(event, path.id)}
              disabled={deleting || path.status === "GENERATING"}
              className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-[var(--ink)]/45 text-white/60 backdrop-blur-sm transition-colors hover:bg-[var(--danger)]/15 hover:text-[var(--danger)] disabled:opacity-40"
              aria-label={`Delete ${path.title}`}
              title="Delete route"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}
