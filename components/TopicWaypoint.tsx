"use client";

import type { PathView } from "@/domain/types";
import VideoEmbed from "./VideoEmbed";

interface TopicWaypointProps {
  topic: PathView["topics"][number];
  isLast: boolean;
  onToggleWatched: (videoId: string, watched: boolean) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TopicWaypoint({ topic, isLast, onToggleWatched, isExpanded, onToggle }: TopicWaypointProps) {
  const watchedCount = topic.videos.filter((v) => v.watched).length;
  const complete = topic.videos.length > 0 && watchedCount === topic.videos.length;

  // Wrapper that calls parent's onToggle - this component doesn't control its own expansion!
  const handleClick = () => {
    if (isExpanded) {
      // If we're closing this topic, pause any playing video inside before unmounting it
      const iframes = document.querySelectorAll<HTMLIFrameElement>('.topic-waypoint iframe');
      iframes.forEach(iframe => {
        iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      });
    }
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
        <div className="pb-8 space-y-4">
          {topic.videos.map((video) => (
            <div key={video.id} className="bg-[var(--ink-2)] border border-white/10 rounded-lg p-3">
              <VideoEmbed youtubeVideoId={video.youtubeVideoId} title={video.title} />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium truncate block hover:text-[var(--route)] transition"
                  >
                    {video.title}
                  </a>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5">
                    {video.channelTitle} · {formatDuration(video.durationSec)}
                  </p>
                </div>
                <label className="flex items-center gap-2 shrink-0 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={video.watched}
                    onChange={(e) => onToggleWatched(video.id, e.target.checked)}
                    className="w-[18px] h-[18px] accent-[var(--route)]"
                  />
                  <span className="text-xs font-mono text-[var(--text-dim)]">Watched</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
      {!isExpanded && <div className="pb-6" />}
    </div>
  );
}