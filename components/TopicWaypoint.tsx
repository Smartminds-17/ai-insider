"use client";

import type { PathView } from "@/domain/types";

import { formatDuration } from "@/lib/formatDuration";

interface TopicWaypointProps {
  topic: PathView["topics"][number];
  isLast: boolean;
  onToggleWatched: (videoId: string, watched: boolean) => void;
  isExpanded: boolean;
  onToggle: () => void;
  activeVideoId: string | null;
  onSelectVideo: (video: PathView["topics"][number]["videos"][number]) => void;
}

export default function TopicWaypoint({
  topic,
  isLast,
  onToggleWatched,
  isExpanded,
  onToggle,
  activeVideoId,
  onSelectVideo,
}: TopicWaypointProps) {
  const watchedCount = topic.videos.filter((v) => v.watched).length;
  const complete = topic.videos.length > 0 && watchedCount === topic.videos.length;

  const handleClick = () => {
    onToggle(); // Tell parent to update the single expanded topic
  };

  return (
    <div className="relative pl-14">

      {/* Trail line + waypoint marker */}
      {!isLast && (
        <div
          className="absolute left-[19px] top-10 bottom-[-8px] w-px"
          style={{ background: complete ? "var(--route)" : "var(--route-dim)" }}
        />
      )}

      <div
        className="absolute left-2.5 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono text-[10px]"
        style={{
          borderColor: complete ? "var(--route)" : "var(--route-dim)",
          background: complete ? "var(--route)" : "var(--ink)",
          color: complete ? "var(--ink)" : "var(--text-dim)",
        }}
      >
        {complete ? "✓" : topic.order + 1}
      </div>

      <button
        onClick={handleClick}
        className="w-full text-left pb-2 group topic-waypoint"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg group-hover:text-[var(--route)] transition">
            {topic.title}
          </h3>
          <span className="font-mono text-xs text-[var(--text-dim)] shrink-0">
            {watchedCount}/{topic.videos.length}
          </span>
        </div>
        
        {/* Show thumbnails of first few videos when collapsed */}
        {!isExpanded && topic.videos.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-hidden">
            {topic.videos.slice(0, 4).map((video) => (
              <div key={video.id} className="w-24 h-16 rounded-md overflow-hidden bg-[var(--ink)] shrink-0 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                {video.watched && (
                  <div className="absolute inset-0 bg-[var(--route)]/60 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {topic.videos.length > 4 && (
              <div className="w-24 h-16 rounded-md bg-[var(--ink-2)] flex items-center justify-center shrink-0 text-xs text-[var(--text-dim)] font-mono">
                +{topic.videos.length - 4} more
              </div>
            )}
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="pb-8 space-y-2">
          {topic.videos.map((video) => {
            const isActive = video.id === activeVideoId;
            return (
              <div
                key={video.id}
                className="flex items-center gap-3 rounded-lg p-2 border transition"
                style={{
                  borderColor: isActive ? "var(--route)" : "rgba(255,255,255,0.1)",
                  background: isActive ? "rgba(232,163,61,0.08)" : "var(--ink-2)",
                  boxShadow: isActive ? "0 0 0 1px var(--route)" : "none",
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelectVideo(video)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  aria-label={`Play ${video.title} in the player above`}
                >
                  <div className="w-24 h-16 rounded-md overflow-hidden bg-[var(--ink)] shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <svg
                        className="w-6 h-6 text-white drop-shadow"
                        fill={isActive ? "var(--route)" : "currentColor"}
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{video.title}</p>
                    <p className="text-xs text-[var(--text-dim)] mt-0.5">
                      {video.channelTitle} · {formatDuration(video.durationSec)}
                      {video.lastPositionSec > 0 && !video.watched && (
                        <> · resume at {formatDuration(video.lastPositionSec)}</>
                      )}
                    </p>
                  </div>
                </button>
                <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none pr-1">
                  <input
                    type="checkbox"
                    checked={video.watched}
                    onChange={(e) => onToggleWatched(video.id, e.target.checked)}
                    className="w-[18px] h-[18px] accent-[var(--route)]"
                  />
                  <span className="text-xs font-mono text-[var(--text-dim)] hidden sm:inline">Watched</span>
                </label>
              </div>
            );
          })}
        </div>
      )}
      {!isExpanded && <div className="pb-6" />}
    </div>
  );
}