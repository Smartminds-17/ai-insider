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
  const [paths, setPaths] = useState<PathSummary[]>(initialPaths);

  function handleDelete(id: string) {
    setPaths(currentPaths => currentPaths.filter(p => p.id !== id));
  }

  if (paths.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="rounded-full bg-white/5 p-3">
          <FilePlus2 className="h-8 w-8 text-[var(--route)]" />
        </div>
        <div className="max-w-sm">
          <h2 className="font-display text-xl font-medium">No routes yet</h2>
          <p className="mt-2 text-sm text-[var(--text-dim)]">
            You haven&apos;t created any learning routes yet. Get started by creating your first one.
          </p>
        </div>
        <Link href="/start" className="btn btn--route">
          Create your first route
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4">
      {paths.map(path => (
        <PathHistoryListItem key={path.id} path={path} onDelete={handleDelete} />
      ))}
    </ul>
  );
}