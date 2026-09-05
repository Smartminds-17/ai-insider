"use client";

import type { PathSummary } from "@/domain/types";
import Link from "next/link";
import { useState } from "react";

interface PathHistoryListProps {
  paths: PathSummary[];
  onDelete?: (id: string) => void;
}

function statusLabel(status: PathSummary["status"], watched: number, total: number): string {
  if (status === "GENERATING") return "Charting route…";
  if (status === "FAILED") return "Failed to generate";
  if (total === 0) return "No videos yet";
  return `${watched}/${total} watched`;
}

type PlanBadgeKind = "day" | "thru" | "guided";
function planBadgeForPath(_path: PathSummary, idx: number): PlanBadgeKind {
  if (idx % 5 === 0) return "guided";
  if (idx % 2 === 0) return "thru";
  return "day";
}

const PLAN_BADGE: Record<PlanBadgeKind, { label: string; chip: string; legend: string }> = {
  day: { label: "Day hike", chip: "chip--ink", legend: "legend-label--dim" },
  thru: { label: "Thru-hike", chip: "chip--route", legend: "legend-label--route" },
  guided: { label: "Guided expedition", chip: "chip--sage", legend: "legend-label--sage" },
};

export default function PathHistoryList({ paths, onDelete }: PathHistoryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/paths/${id}`, { method: "DELETE" });
      if (res.ok && onDelete) onDelete(id);
    } catch (err) {
      console.error("Failed to delete path:", err);
    } finally {
      setDeletingId(null);
    }
  }

  if (paths.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="legend-label legend-label--dim block mb-2">Empty trail map</p>
        <h2 className="font-display text-2xl font-medium mb-2">No routes yet</h2>
        <p className="text-[var(--text-dim)] mb-6 max-w-md mx-auto leading-relaxed">
          Your first trail appears here. Once you have routes, this surface shows progress,
          trail-log activity, and guides assigned to each one.
        </p>
        <Link
          href="/"
          className="btn btn--route"
        >
          Map your first route
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {paths.map((path, idx) => {
        const pct = path.totalVideos > 0 ? Math.round((path.watchedVideos / path.totalVideos) * 100) : 0;
        const plan = planBadgeForPath(path, idx);
        const badge = PLAN_BADGE[plan];
        const logsCount = (idx + 2) % 9;
        const hikerCount = 4 + ((idx * 7) % 29);
        return (
          <li key={path.id}>
            <div className="surface-card p-5 hover:border-white/20 transition">
              <div className="flex flex-col lg:flex-row gap-5">
                <div className="flex-1 min-w-0">
                  <Link href={`/path/${path.id}`} className="block">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h2 className="font-display text-lg sm:text-xl truncate hover:text-[var(--route)] transition">
                            {path.title}
                          </h2>
                          <span className={`chip ${badge.chip}`}>
                            <span className="chip__dot" />
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-dim)] truncate max-w-xl">
                          {path.prompt}
                        </p>
                      </div>
                      <span className={`legend-label ${badge.legend} shrink-0 mt-1`}>
                        {statusLabel(path.status, path.watchedVideos, path.totalVideos)}
                      </span>
                    </div>
                  </Link>

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {path.status === "READY" && path.totalVideos > 0 && (
                      <>
                        <div className="flex-1 min-w-[180px] h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${pct}%`, background: "var(--route)" }}
                          />
                        </div>
                        <span className="font-mono text-xs text-[var(--text-dim)]">
                          {pct}%
                        </span>
                      </>
                    )}
                    {path.status === "GENERATING" && (
                      <div className="flex items-center gap-2 font-mono text-xs text-[var(--route)]">
                        <span className="inline-block w-2 h-2 rounded-full bg-[var(--route)] animate-pulse" />
                        Charting…
                      </div>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        className="chip chip--sage"
                        aria-label="Request a trail guide for this route"
                      >
                        <span className="chip__dot" />
                        Guide
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, path.id)}
                        disabled={deletingId === path.id}
                        className="chip chip--ink disabled:opacity-50 transition shrink-0"
                        title="Delete route"
                        style={{ color: deletingId === path.id ? undefined : "#f87171", borderColor: deletingId === path.id ? undefined : "rgba(248,113,113,0.3)" }}
                      >
                        {deletingId === path.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Design slot · community/plan side column */}
                <div className="lg:w-56 shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-5 flex flex-col gap-3">
                  <div>
                    <p className="legend-label legend-label--sage block mb-2">
                      Trail logs
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="chip chip--ink">
                        <span className="chip__dot" />
                        {logsCount === 0 ? "No logs" : `${logsCount} log${logsCount === 1 ? "" : "s"}`}
                      </span>
                      {logsCount > 0 && (
                        <button type="button" className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition font-mono">
                          View
                        </button>
                      )}
                    </div>
                    {logsCount === 0 && (
                      <p className="text-[11px] text-[var(--text-dim)] mt-2 leading-snug">
                        Finish this trail &amp; publish the first log for the community.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="legend-label legend-label--dim block mb-2">
                      Others hiking
                    </p>
                    <div className="flex items-center -space-x-2">
                      {Array.from({ length: Math.min(3, Math.max(1, Math.floor(hikerCount / 10))) }).map((_, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full bg-gradient-to-br border-2 border-[var(--ink)] flex items-center justify-center font-display text-[10px] font-medium"
                          style={
                            i % 3 === 0
                              ? { backgroundImage: "linear-gradient(135deg, var(--route), #7a4e11)", color: "#1A1308" }
                              : i % 3 === 1
                                ? { backgroundImage: "linear-gradient(135deg, var(--sage), #2f5847)", color: "#0F1713" }
                                : { background: "var(--ink-3)", color: "var(--text-dim)", borderColor: "rgba(255,255,255,0.10)" }
                          }
                        >
                          {["JD", "SK", "AL", "MR", "RV", "NP"][i % 6]}
                        </div>
                      ))}
                      <div className="w-7 h-7 rounded-full bg-[var(--ink-3)] border-2 border-[var(--ink)] flex items-center justify-center font-mono text-[9px] text-[var(--text-dim)]">
                        +{hikerCount}
                      </div>
                    </div>
                  </div>

                  {plan === "guided" && (
                    <div>
                      <p className="legend-label legend-label--sage block mb-2">
                        Your trail guide
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a373] to-[#7a4e11] flex items-center justify-center font-display text-xs font-medium text-[#1A1308]">
                          ML
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">Maria L.</p>
                          <p className="text-[10px] text-[var(--text-dim)] font-mono">
                            Session · Tue 6pm
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
