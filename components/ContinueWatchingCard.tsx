import type { PathSummary } from "@/domain/types";
import Link from "next/link";

interface ContinueWatchingCardProps {
  path: PathSummary;
}

export default function ContinueWatchingCard({ path }: ContinueWatchingCardProps) {
  if (!path.resumeVideoId) return null;

  const resumeUrl = `/path/${path.id}?video=${path.resumeVideoId}`;

  return (
    <div className="surface-card mb-8 rounded-lg p-6">
      <h2 className="mb-2 text-sm font-medium text-[var(--text-dim)]">Continue watching</h2>
      <h3 className="mb-3 font-display text-xl font-medium">{path.title}</h3>
      <div className="flex items-center justify-between">
        <span className="text-lg font-medium text-[var(--route)]">{path.progressPercent}%</span>
        <Link href={resumeUrl} className="btn btn--route">
          Resume
        </Link>
      </div>
    </div>
  );
}