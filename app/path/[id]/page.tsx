"use client";

import PathRoadmap from "@/components/PathRoadmap";
import { useParams } from "next/navigation";
import { Suspense } from "react";

export default function PathPage() {
  const { id } = useParams();

  if (typeof id !== "string") {
    return null;
  }

  // PathRoadmap is a client component that loads its own data; the Suspense
  // boundary keeps the route shell stable while that happens.
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="animate-pulse font-mono text-sm text-[var(--text-dim)]">Loading route…</p>
        </div>
      }
    >
      <PathRoadmap pathId={id} />
    </Suspense>
  );
}