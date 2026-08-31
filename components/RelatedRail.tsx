"use client";

import { useEffect, useState } from "react";
import type { RankedVideo } from "@/domain/types";

interface RelatedRailProps {
  field: string;
}

export default function RelatedRail({ field }: RelatedRailProps) {
  const [videos, setVideos] = useState<RankedVideo[] | null>(null);

  useEffect(() => {
    fetch(`/api/related?field=${encodeURIComponent(field)}`)
      .then((res) => res.json())
      .then((json) => setVideos(json.data ?? []))
      .catch(() => setVideos([]));
  }, [field]);

  if (!videos || videos.length === 0) return null;

  return (
    <aside className="mt-16 pt-8 border-t border-white/10">
      <p className="font-mono text-xs tracking-widest uppercase text-[var(--sage)] mb-4">
        Off the trail — for inspiration
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {videos.map((v) => (
          <a
            key={v.youtubeVideoId}
            href={`https://www.youtube.com/watch?v=${v.youtubeVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <div className="aspect-video rounded-md overflow-hidden bg-[var(--ink-2)] mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.thumbnailUrl}
                alt={v.title}
                className="w-full h-full object-cover group-hover:opacity-80 transition"
              />
            </div>
            <p className="text-xs text-[var(--text-dim)] line-clamp-2 group-hover:text-[var(--text)] transition">
              {v.title}
            </p>
          </a>
        ))}
      </div>
    </aside>
  );
}
