"use client";

import type { PathSummary } from "@/domain/types";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import PathHistoryListItem from "./PathHistoryListItem";

interface PathHistoryListProps {
  paths: PathSummary[];
}

export default function PathHistoryList({ paths: initialPaths }: PathHistoryListProps) {
  // Keep deletions local while still letting fresh props from the page flow
  // through (focus revalidation replaces the array on every fetch).
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const paths = initialPaths.filter((path) => !deletedIds.includes(path.id));

  function handleDelete(id: string) {
    setDeletedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  if (paths.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-6 p-8 sm:p-12 text-center transition-all duration-300 hover:border-white/30">
        <div className="rounded-full bg-white/5 p-4 transition-all duration-300 hover:scale-110 hover:bg-white/10">
          <FilePlus2 className="h-10 w-10 text-[var(--route)] transition-colors duration-300" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-display text-2xl font-medium">No routes yet</h2>
          <p className="mt-3 text-base text-[var(--text-dim)]">
            You haven&apos;t created any learning routes yet. Get started by creating your first one.
          </p>
        </div>
        <Link href="/" className="btn btn--route transition-all duration-200 hover:scale-105 active:scale-95">
          Create your first route
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    );
  }

  return (
      <ul className="space-y-4">
        {paths.map(path => (
          <PathHistoryListItem key={path.id} path={path} onDelete={handleDelete} />
        ))}
      </ul>
    );
}