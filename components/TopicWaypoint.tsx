"use client";

import { useState } from "react";
import VideoEmbed from "./VideoEmbed";
import type { PathView } from "@/domain/types";

interface TopicWaypointProps {
  topic: PathView["topics"][number];
  isLast: boolean;
  onToggleWatched: (videoId: string, watched: boolean) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TopicWaypoint({ topic, isLast, onToggleWatched }: TopicWaypointProps) {
  const [expanded, setExpanded] = useState(false);
  const watchedCount = topic.videos.filter((v) => v.watched).length;
  const complete = topic.videos.length > 0 && watchedCount === topic.videos.length;

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
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left pb-2 group"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg group-hover:text-[var(--route)] transition">
            {topic.title}
          </h3>
          <span className="font-mono text-xs text-[var(--text-dim)] shrink-0">
            {watchedCount}/{topic.videos.length}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="pb-8 space-y-4">
          {topic.videos.map((video) => (
            <div key={video.id} className="bg-[var(--ink-2)] border border-white/10 rounded-lg p-3">
              <VideoEmbed youtubeVideoId={video.youtubeVideoId} title={video.title} />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{video.title}</p>
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
      {!expanded && <div className="pb-6" />}
    </div>
  );
}
