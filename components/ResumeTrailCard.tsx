import type { PathSummary } from "@/domain/types";
import { formatRuntime } from "@/lib/formatDuration";
import { ArrowRight, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Returning-user billboard on the home screen, borrowing the streaming-service
// "hero + resume" pattern: one title, one primary action, backdrop art from the
// lesson the learner stopped on. Everything else on the page is secondary.
export default function ResumeTrailCard({ path }: { path: PathSummary }) {
  const resumeHref = path.resumeVideoId
    ? `/path/${path.id}?video=${encodeURIComponent(path.resumeVideoId)}`
    : `/path/${path.id}`;

  const lessonsLeft = Math.max(0, path.totalVideos - path.watchedVideos);

  return (
    <section aria-labelledby="resume-trail-heading" className="mx-auto mb-10 w-full max-w-4xl">
      <div className="surface-card relative isolate overflow-hidden ring-1 ring-[var(--route)]/30">
        {path.resumeThumbnailUrl && (
          <>
            <Image
              src={path.resumeThumbnailUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 900px"
              className="object-cover opacity-30"
            />
            <div
              aria-hidden="true"
              className="surface-card__layer inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/90 to-[var(--ink)]/25"
            />
            <div
              aria-hidden="true"
              className="surface-card__layer inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--ink)] to-transparent"
            />
          </>
        )}

        <div className="relative flex min-h-[280px] flex-col justify-end gap-4 p-5 sm:min-h-[320px] sm:p-7">
          <div>
            <p id="resume-trail-heading" className="legend-label legend-label--route mb-2">
              Continue learning
            </p>
            <h2 className="font-display max-w-xl text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
              {path.title}
            </h2>
            {path.resumeVideoTitle && (
              <p className="mt-2 line-clamp-1 max-w-xl text-sm text-[var(--text-dim)]">
                Up next · {path.resumeVideoTitle}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--text-dim)]">
            <span className="chip chip--route">
              <span className="chip__dot" />
              {path.progressPercent}% complete
            </span>
            <span className="tabular-nums">
              {path.watchedVideos} of {path.totalVideos} lessons
              {lessonsLeft > 0 ? ` · ${lessonsLeft} left` : ""}
            </span>
            {path.resumeRemainingSec !== null && path.resumeRemainingSec > 0 && (
              <>
                <span aria-hidden="true" className="text-[var(--ink-4)]">·</span>
                <span className="tabular-nums">{formatRuntime(path.resumeRemainingSec)} left in this lesson</span>
              </>
            )}
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={`Progress in ${path.title}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={path.progressPercent}
          >
            <div
              className="h-full rounded-full bg-[var(--route)] transition-[width] duration-700 ease-[var(--ease-out)]"
              style={{ width: `${path.progressPercent}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link href={resumeHref} className="btn btn--route min-h-11">
              <Play className="h-4 w-4" fill="currentColor" />
              Resume lesson
            </Link>
            <Link href="/paths" className="btn btn--outline min-h-11">
              All routes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
