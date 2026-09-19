"use client";

import type { PathView } from "@/domain/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import RelatedRail from "./RelatedRail";
import TopicWaypoint from "./TopicWaypoint";
import VideoPlayer, { type ActiveVideo } from "./VideoPlayer";

interface PathRoadmapProps {
  pathId: string;
}

type PathVideo = PathView["topics"][number]["videos"][number];

export default function PathRoadmap({ pathId }: PathRoadmapProps) {
  const router = useRouter();
  const [path, setPath] = useState<PathView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedTopicIndex, setExpandedTopicIndex] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);

  // GET /api/paths/[id] only ever returns a path owned by the requesting user
  // (anonymous-cookie or signed-in) — see src/application/getPath.ts, which
  // scopes the query by userId. So the player naturally only ever appears
  // for someone who created this path; anyone else gets `notFound` below.
  const handleSelectVideo = async (video: PathVideo) => {
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
  };

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
    const interval = setInterval(fetchPath, 2000);
    return () => clearInterval(interval);
  }, [path, fetchPath]);

  async function handleToggleWatched(videoId: string, watched: boolean) {
    setPath((prev) =>
      prev
        ? {
            ...prev,
            topics: prev.topics.map((t) => ({
              ...t,
              videos: t.videos.map((v) => (v.id === videoId ? { ...v, watched } : v)),
            })),
          }
        : prev
    );
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, watched }),
    });
  }

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

  const totalVideos = path.topics.reduce((sum, t) => sum + t.videos.length, 0);
  const watchedVideos = path.topics.reduce((sum, t) => sum + t.videos.filter((v) => v.watched).length, 0);
  const pct = totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;

  // Find the most recently-watched video, if any, to power the hero
  const allVideos = path.topics.flatMap((topic) => topic.videos);
  const lastWatchedVideo = allVideos.reduce((last, video) => {
    if (!last) return video;
    if (!video.lastPositionSec) return last;
    if (!last.lastPositionSec || video.lastPositionSec > last.lastPositionSec) {
      return video;
    }
    return last;
  }, null as PathVideo | null);

  return (
    <main className="flex-1 px-6 py-16">
      {/* A "continue watching" hero card that picks up the most-recently-viewed
          video. This is separate from the active video selection, which follows
          the user's clicks inside the syllabus below. */}
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

      {/* Render sticky player only when a video is selected */}
      {path.status === "READY" && activeVideo && <VideoPlayer video={activeVideo} />}

      {/* Resume button card - shows when no active video and user has a last watched video */}
      {path.status === "READY" && !activeVideo && lastWatchedVideo && (
        <div className="max-w-3xl mx-auto mb-12">
          <div className="surface-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="legend-label legend-label--ink mb-2">Continue watching</p>
              <h3 className="text-lg font-medium">{lastWatchedVideo.title}</h3>
              <p className="text-sm text-[var(--text-dim)] mt-1">
                {lastWatchedVideo.lastPositionSec
                  ? `Resume at ${Math.round(lastWatchedVideo.lastPositionSec / 60)}m ${Math.round(lastWatchedVideo.lastPositionSec % 60)}s`
                  : "Start watching"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSelectVideo(lastWatchedVideo)}
              className="btn btn--sage whitespace-nowrap"
            >
              Resume
            </button>
          </div>
        </div>
      )}

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
              onToggleWatched={handleToggleWatched}
              isExpanded={expandedTopicIndex === i}
              onToggle={() => handleToggleTopic(i)}
              activeVideoId={activeVideo?.id ?? null}
              onSelectVideo={handleSelectVideo}
            />
          ))}
        </div>

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