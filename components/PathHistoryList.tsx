"use client";

import type { PathSummary } from "@/domain/types";
import Link from "next/link";
import { useState } from "react";

interface PathHistoryListProps {
  paths: PathSummary[];
  onDelete?: (id: string) => void; // Callback for parent to refresh after deletion
}

function statusLabel(status: PathSummary["status"], watched: number, total: number): string {
  if (status === "GENERATING") return "Charting route…";
  if (status === "FAILED") return "Failed to generate";
  if (total === 0) return "No videos yet";
  return `${watched}/${total} watched`;
}

export default function PathHistoryList({ paths, onDelete }: PathHistoryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault(); // Prevent navigation to path page when clicking delete
    if (deletingId) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/paths/${id}`, {
        method: "DELETE",
      });
      if (res.ok && onDelete) {
        onDelete(id);
      }
    } catch (err) {
      console.error("Failed to delete path:", err);
    } finally {
      setDeletingId(null);
    }
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
    <ul className="space-y-4">
      {paths.map((path) => {
        const pct = path.totalVideos > 0 ? Math.round((path.watchedVideos / path.totalVideos) * 100) : 0;
        return (
          <li key={path.id}>
            <div className="p-4 rounded-lg bg-[var(--ink-2)] border border-white/10 hover:border-white/20 transition">
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/path/${path.id}`} className="block">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-display text-lg truncate hover:text-[var(--route)] transition">{path.title}</h2>
                        <p className="text-xs text-[var(--text-dim)] mt-1 truncate">{path.prompt}</p>
                      </div>
                      <span className="font-mono text-xs text-[var(--text-dim)] shrink-0 mt-1">
                        {statusLabel(path.status, path.watchedVideos, path.totalVideos)}
                      </span>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between mt-3">
                    {path.status === "READY" && path.totalVideos > 0 && (
                      <div className="flex-1 mr-4 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: "var(--route)" }}
                        />
                      </div>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, path.id)}
                      disabled={deletingId === path.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition shrink-0 font-mono"
                      title="Delete route"
                    >
                      {deletingId === path.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}