"use client";

import type { RankedVideo } from "@/domain/types";
import { useEffect, useState } from "react";
import VideoEmbed from "./VideoEmbed";

interface RelatedRailProps {
  field: string;
}

export default function RelatedRail({ field }: RelatedRailProps) {
  const [videos, setVideos] = useState<RankedVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [loadedField, setLoadedField] = useState<string | null>(null);

  const loading = loadedField !== field;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/related?field=${encodeURIComponent(field)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setVideos(json.data ?? []);
        setLoadedField(field);
      })
      .catch(() => {
        if (cancelled) return;
        setVideos([]);
        setLoadedField(field);
      });
    return () => {
      cancelled = true;
    };
  }, [field]);

  if (loading) return null;
  if (videos.length === 0) return null;

  return (
    <section className="section-rail">
      <p className="legend-label legend-label--sage mb-4">
        Off the trail — for inspiration
      </p>
      <div className="space-y-4">
        {activeVideo && (
          <div className="mb-6">
            {videos.filter(v => v.youtubeVideoId === activeVideo).map((v) => (
              <div key={v.youtubeVideoId} className="bg-[var(--ink-2)] border border-white/10 rounded-lg p-3">
                <VideoEmbed youtubeVideoId={v.youtubeVideoId} title={v.title} durationSec={v.durationSec} />
                <p className="mt-3 text-sm font-medium">{v.title}</p>
                <button 
                  onClick={() => setActiveVideo(null)}
                  className="mt-2 text-xs text-[var(--text-dim)] hover:text-[var(--route)] transition"
                >
                  Close player
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {videos.map((v) => (
            <button
              key={v.youtubeVideoId}
              onClick={() => setActiveVideo(v.youtubeVideoId)}
              className="group text-left"
            >
              <div className="aspect-video rounded-md overflow-hidden bg-[var(--ink-2)] mb-2 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumbnailUrl}
                  alt={v.title}
                  className="w-full h-full object-cover group-hover:opacity-80 transition"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              <p className="text-xs text-[var(--text-dim)] line-clamp-2 group-hover:text-[var(--text)] transition">
                {v.title}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}