"use client";

import type { PathView } from "@/domain/types";
import { computePathProgress, videoPercent } from "@/domain/progress";
import { MessageCircle, Play, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import CreatorsRail from "./CreatorsRail";
import RelatedRail from "./RelatedRail";
import TopicWaypoint from "./TopicWaypoint";
import type { ActiveVideo } from "./VideoPlayer";
import VideoPlayer from "./VideoPlayer";

import { useSystemConfig } from "@/hooks/useSystemConfig";

interface PathRoadmapProps {
  pathId: string;
}

type PathVideo = PathView["topics"][number]["videos"][number];

export default function PathRoadmap({ pathId }: PathRoadmapProps) {
  const router = useRouter();
  const config = useSystemConfig();
  const [path, setPath] = useState<PathView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedTopicIndex, setExpandedTopicIndex] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);
  const [dismissedContinueWatching, setDismissedContinueWatching] = useState(false);
  const [isContinueWatchingVisible, setIsContinueWatchingVisible] = useState(true);
  const [livePositions, setLivePositions] = useState<Record<string, number>>({});
  const lastScrollYRef = useRef(0);
  const playerAnchorRef = useRef<HTMLDivElement>(null);

  // Live progress from the player: the roadmap percentage moves while the
  // lesson plays, without refetching the page. High-water mark, so rewinding
  // never makes the route look less complete.
  const handleLiveProgress = useCallback(
    (update: { videoId: string; positionSec: number }) => {
      setLivePositions((previous) => {
        const current = previous[update.videoId] ?? 0;
        if (update.positionSec <= current) return previous;
        return { ...previous, [update.videoId]: update.positionSec };
      });
    },
    []
  );

  // Show/hide the continue-watching bar on scroll direction. A ref keeps the
  // listener stable (no re-render or re-binding on every scroll tick).
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
        setIsContinueWatchingVisible(false);
      } else {
        setIsContinueWatchingVisible(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Find and remove old persistent community floating circle code if present
  useEffect(() => {
    // Remove any residual floating circle elements from the DOM
    const floatingCircle = document.querySelector('[data-community-floating-circle]');
    if (floatingCircle) {
      floatingCircle.remove();
    }
  }, []);

  // GET /api/paths/[id] only ever returns a path owned by the requesting user
  // (anonymous-cookie or signed-in) — see src/application/getPath.ts, which
  // scopes the query by userId. So the player naturally only ever appears
  // for someone who created this path; anyone else gets `notFound` below.
  const handleSelectVideo = useCallback(async (video: PathVideo) => {
    // Fetch the latest saved position from the backend before setting as active video
    try {
      const res = await fetch(`/api/progress?videoId=${video.id}`);
      const json = await res.json();
      const latestPosition = json.data?.lastPositionSec ?? video.lastPositionSec;

      setActiveVideo({
        id: video.id,
        youtubeVideoId: video.youtubeVideoId,
        title: video.title,
        channelTitle: video.channelTitle,
        durationSec: video.durationSec,
        lastPositionSec: latestPosition,
      });
    } catch (err) {
      // Fallback to local state if fetch fails
      console.warn("Failed to fetch latest video position, using cached value:", err);
      setActiveVideo({
        id: video.id,
        youtubeVideoId: video.youtubeVideoId,
        title: video.title,
        channelTitle: video.channelTitle,
        durationSec: video.durationSec,
        lastPositionSec: video.lastPositionSec,
      });
    }
  }, []);

  const handleToggleTopic = (index: number) => {
    setExpandedTopicIndex((prev) => (prev === index ? null : index));
  };

  const fetchPath = useCallback(async () => {
    try {
      const res = await fetch(`/api/paths/${pathId}`);
      if (res.status === 404) {
        setNotFound(true);
        setPath(null); // Clear path state if it becomes not found later
        return;
      }
      const json = await res.json();
      setPath(json.data);
    } catch (err) {
      // Gracefully handle network errors without crashing - will retry on next interval
      console.warn("Failed to fetch path, will retry:", err);
    }
  }, [pathId]);

  useEffect(() => {
    // Standard fetch-on-mount idiom: fetchPath is async and calls setState
    // once data arrives, not synchronously within the effect body itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPath();
  }, [fetchPath]);

  useEffect(() => {
    if (!path || path.status !== "GENERATING") return;
    const interval = setInterval(fetchPath, config.pathGenerationPollIntervalMs);
    return () => clearInterval(interval);
  }, [path, fetchPath, config.pathGenerationPollIntervalMs]);

  // The player is opt-in: it only appears when the learner picks a lesson or
  // presses Resume in the bottom continue-watching bar. Landing on the route
  // overview never auto-opens a video.

  // When a lesson is picked from deep in the syllabus, bring the sticky player
  // back into view — otherwise playback starts above the fold and looks broken.
  useEffect(() => {
    if (!activeVideo?.id) return;
    const anchor = playerAnchorRef.current;
    if (!anchor) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anchor.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activeVideo?.id]);

  // If path becomes not found after loading, redirect to /paths
  useEffect(() => {
    if (notFound) {
      // Wait a second then redirect so the not-found message shows briefly
      const redirect = setTimeout(() => router.push("/paths"), 2000);
      return () => clearTimeout(redirect);
    }
  }, [notFound, router]);

  async function handleDelete() {
    if (!path || deleting) return;
    if (!window.confirm("Are you sure you want to delete this route? This action cannot be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/paths/${pathId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/paths");
      } else if (res.status === 404) {
        // If path is already gone, just redirect
        setNotFound(true);
      }
    } catch (err) {
      console.error("Failed to delete path:", err);
      setDeleting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-[var(--text-dim)]">This route doesn&apos;t exist. It may have been removed.</p>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="font-mono text-sm text-[var(--text-dim)] animate-pulse">Loading route…</p>
      </div>
    );
  }

  const resolvedPath = path;

  const allVideos = path.topics.flatMap((topic) => topic.videos);
  const totalVideos = allVideos.length;
  // Shared canonical progress — the history list uses the same function, so
  // every screen agrees on the percentage. Merge the live position of the
  // lesson currently playing on top of the fetched progress.
  const progressVideos = allVideos.map((video) => {
    const live = livePositions[video.id] ?? 0;
    return live > video.farthestPositionSec
      ? { ...video, farthestPositionSec: live }
      : video;
  });
  const { percent: pct } = computePathProgress(progressVideos);

  // Most recently-watched video, by progress-update time (not by position —
  // a long video watched once must not beat the video watched five minutes ago).
  const lastWatchedVideo = allVideos.reduce((last, video) => {
    if (!video.lastPositionSec || !video.lastWatchedAt) return last;
    if (!last) return video;
    return new Date(video.lastWatchedAt).getTime() > new Date(last.lastWatchedAt ?? 0).getTime()
      ? video
      : last;
  }, null as PathVideo | null);

  const showContinueBar =
    path.status === "READY" &&
    !activeVideo &&
    !dismissedContinueWatching &&
    Boolean(lastWatchedVideo && lastWatchedVideo.lastPositionSec > 0);

  const continuePct = lastWatchedVideo ? videoPercent(lastWatchedVideo) : 0;

  // Find the next video in sequence to preload for seamless playback
  const nextVideo = activeVideo ? allVideos.find(v => v.id !== activeVideo.id && allVideos.indexOf(v) > allVideos.findIndex(v => v.id === activeVideo.id)) : null;

  return (
    <main
      className="flex-1 px-5 py-10 sm:px-8 sm:py-16"
      style={showContinueBar ? { paddingBottom: "8rem" } : undefined}
    >
      {/* Single sticky player for the whole path — stays pinned to the top of the
          viewport while the syllabus scrolls underneath it. Only rendered on this
          path's own page, and this page 404s for anyone who isn't its owner. */}
      {/* Pills row + title render above the player (matches the Figma "ai-insider"
          frame, node 2019:85: pills → title → player), not below it. */}
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <span className="legend-label legend-label--route">
            {path.status === "GENERATING" ? "Charting route…" : `${pct}% complete`}
          </span>
          <span className="text-[var(--ink-4)]">·</span>
          <span className="chip chip--ink">
            <span className="chip__dot" />
            {path.topics.length} stops · {totalVideos} videos
          </span>
          {path.status === "READY" && (
            <>
              <span className="text-[var(--ink-4)]">·</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn--ghost disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: "rgba(248,113,113,0.35)", color: "#f87171" }}
              >
                {deleting ? "Deleting..." : "Delete Route"}
              </button>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 mb-6 text-center">
          <h1 className="font-display text-3xl sm:text-4xl font-medium leading-tight">
            {path.title}
          </h1>
        </div>
      </div>

      {/* Render sticky player only when a video is selected. The zero-height
          anchor above it is the scroll target when a lesson is picked. */}
      {path.status === "READY" && activeVideo && (
        <div ref={playerAnchorRef} className="scroll-mt-[var(--header-h)]" aria-hidden="true" />
      )}
      {path.status === "READY" && activeVideo && <VideoPlayer video={activeVideo} progressFlushIntervalMs={config.progressAutoSaveIntervalMs} onProgress={handleLiveProgress} />}

      {/* Continue-watching bar — fixed to the bottom, but only while no player
          is open. Pressing Resume is the one action on this page that opens
          the player at the saved position. */}
      {showContinueBar && lastWatchedVideo && (
        <div
          role="region"
          aria-label="Continue watching"
          className={`fixed inset-x-0 bottom-0 z-[var(--z-player)] border-t border-[var(--border-subtle)] bg-[var(--surface-1)]/95 backdrop-blur-xl transition-transform duration-[var(--motion-slow)] ease-[var(--ease-out)] ${
            isContinueWatchingVisible ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div
            className="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-3 sm:px-6"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="relative hidden h-12 w-20 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lastWatchedVideo.thumbnailUrl}
                alt=""
                className="h-full w-full object-cover opacity-80"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <Play className="h-4 w-4 text-white" fill="currentColor" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="legend-label legend-label--route mb-1">Continue watching</p>
              <p className="truncate text-sm text-[var(--text)]">{lastWatchedVideo.title}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--route)]"
                    style={{ width: `${continuePct}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-[11px] text-[var(--text-dim)]">
                  {continuePct}%
                </span>
              </div>
            </div>

            {path.community && (
              <Link
                href="/chat"
                className="hidden min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-white/5 hover:text-[var(--text)] sm:flex"
                title={`${path.community.name} — open community messages`}
                aria-label={`Open ${path.community.name} community messages`}
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => void handleSelectVideo(lastWatchedVideo)}
              className="btn btn--route btn--sm min-h-11 shrink-0"
            >
              <Play className="h-4 w-4" fill="currentColor" />
              Resume
            </button>

            <button
              type="button"
              onClick={() => setDismissedContinueWatching(true)}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
              aria-label="Dismiss continue watching bar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Removed old persistent community floating circle - per user request to eliminate intrusive UI */}

      <div className="max-w-3xl mx-auto">
        {path.status === "GENERATING" && (
          <div className="surface-card p-5 mb-10">
            <p className="legend-label legend-label--route mb-1.5">In progress</p>
            <p className="text-sm text-[var(--text-dim)] leading-relaxed">
              Finding the best videos for each stop — this takes a moment. We rank
              tutorials by view count, recency, and duration fit to the difficulty of the
              waypoint.
            </p>
          </div>
        )}

        {path.status === "FAILED" && (
          <p className="text-sm text-red-400 mb-10">
            Something went wrong charting this route. Try creating a new one.
          </p>
        )}

        <div>
          {path.topics.map((topic, i) => (
            <TopicWaypoint
              key={topic.id}
              topic={topic}
              isLast={i === path.topics.length - 1}
              isExpanded={expandedTopicIndex === i}
              onToggle={() => handleToggleTopic(i)}
              activeVideoId={activeVideo?.id ?? null}
              onSelectVideo={handleSelectVideo}
              progressUpdateIntervalMs={config.progressAutoSaveIntervalMs}
            />
          ))}
        </div>

        {path.status === "READY" && <CreatorsRail videos={allVideos} />}
        {path.status === "READY" && <RelatedRail field={path.title} />}

        {false && resolvedPath.status === "READY" && (
          <section className="section-rail">
            <p className="legend-label legend-label--sage mb-4">
              On the same trail — other hikers right now
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="surface-card p-4 flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--route)] to-[#7a4e11] flex items-center justify-center font-display text-sm font-medium text-[#1A1308]">
                    JD
                  </div>
                  <span className="presence-dot absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">Jamal D.</p>
                  <p className="text-xs text-[var(--text-dim)] font-mono">
                    42% · on stop 3 / {resolvedPath.topics.length}
                  </p>
                </div>
                <button
                  type="button"
                  className="chip chip--ink"
                  aria-label="Send message to Jamal"
                >
                  Message
                </button>
              </article>

              <article className="surface-card p-4 flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--sage)] to-[#375346] flex items-center justify-center font-display text-sm font-medium text-[#0F1713]">
                    SK
                  </div>
                  <span className="presence-dot absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">Sara K.</p>
                  <p className="text-xs text-[var(--text-dim)] font-mono">
                    71% · on stop {Math.max(1, Math.floor(resolvedPath.topics.length * 0.7))} / {resolvedPath.topics.length}
                  </p>
                </div>
                <button
                  type="button"
                  className="chip chip--ink"
                  aria-label="Send message to Sara"
                >
                  Message
                </button>
              </article>

              <article className="surface-card p-4 flex items-center gap-3 opacity-80">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--ink-3)] border border-white/10 flex items-center justify-center font-display text-xs text-[var(--text-dim)]">
                    +27
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Others on this trail</p>
                  <p className="text-xs text-[var(--text-dim)] font-mono">
                    27 started in the last 7 days
                  </p>
                </div>
                <button type="button" className="chip chip--sage" aria-label="Open community">
                  <span className="chip__dot" />
                  Community
                </button>
              </article>

              <article className="surface-card p-4 sm:col-span-2 border-dashed">
                <p className="legend-label legend-label--dim mb-2">
                  Design slot · Trail logs for this route
                </p>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                  Future surface: every published Trail Log written by hikers who completed
                  this route will live here. You&apos;ll be able to attach a screenshot of
                  your progress with one click and browse tips / detours other hikers took
                  between the same waypoints.
                </p>
              </article>
            </div>
          </section>
        )}

        {false && resolvedPath.status === "READY" && (
          <section className="section-rail">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div>
                <p className="legend-label legend-label--sage mb-2">Trail guides</p>
                <h3 className="font-display text-xl font-medium leading-tight">
                  Someone who&apos;s already done this route can help.
                </h3>
              </div>
              <button type="button" className="btn btn--sage">
                Browse all guides for this trail →
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <article className="surface-card p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#d4a373] to-[#7a4e11] flex items-center justify-center font-display text-base font-medium text-[#1A1308]">
                    ML
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base font-medium truncate">Maria L.</p>
                    <p className="text-xs text-[var(--text-dim)] font-mono">
                      Data analyst · 41 hikers guided · ★ 4.9
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                  Senior analyst at a fintech. I&apos;ve reviewed this exact route 18 times with
                  beginners. Strong on the SQL + Python basics stops.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip chip--ink">SQL waypoints</span>
                  <span className="chip chip--ink">Portfolio review</span>
                  <span className="chip chip--ink">45-min 1:1</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="font-mono text-xs text-[var(--text-dim)]">
                    1 credit · ~45 min
                  </p>
                  <button type="button" className="btn btn--ink">
                    Request session
                  </button>
                </div>
              </article>

              <article className="surface-card p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--sage)] to-[#2f5847] flex items-center justify-center font-display text-base font-medium text-[#0F1713]">
                    RK
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base font-medium truncate">Ravi K.</p>
                    <p className="text-xs text-[var(--text-dim)] font-mono">
                      ML engineer · 27 hikers guided · ★ 4.8
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-dim)] leading-relaxed">
                  I work with folks switching into data from other careers. Happy to deep-dive
                  the Pandas + EDA stops and help you avoid tutorial purgatory.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip chip--ink">Python / Pandas</span>
                  <span className="chip chip--ink">Resume chat</span>
                  <span className="chip chip--ink">60-min 1:1</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="font-mono text-xs text-[var(--text-dim)]">
                    1 credit · ~60 min
                  </p>
                  <button type="button" className="btn btn--ink">
                    Request session
                  </button>
                </div>
              </article>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}