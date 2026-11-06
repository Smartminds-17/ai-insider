"use client";

import { useState } from "react";
import { ExternalLink, ListVideo, Play, X } from "lucide-react";

import type { TopicPlaylist as TopicPlaylistData } from "@/domain/types";

interface TopicPlaylistProps {
  playlist: TopicPlaylistData;
}

/**
 * A curated YouTube playlist picked for this waypoint during generation.
 * It stays collapsed until the learner asks for it, then embeds inline — the
 * route itself still opens on an explicit action.
 */
export default function TopicPlaylist({ playlist }: TopicPlaylistProps) {
  const [open, setOpen] = useState(false);

  const meta = [
    playlist.itemCount ? `${playlist.itemCount} videos` : "Playlist",
    playlist.channelTitle || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-lg border border-white/10 bg-[var(--ink-2)] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-[var(--ink)]">
          {playlist.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playlist.thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[var(--text-dim)]">
              <ListVideo aria-hidden="true" className="h-6 w-6" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <ListVideo aria-hidden="true" className="h-5 w-5 text-white drop-shadow" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="legend-label legend-label--sage">Suggested playlist</p>
          <p className="truncate text-sm font-medium">{playlist.title}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--text-dim)]">{meta}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--route)]/60 hover:text-[var(--route)]"
          >
            {open ? (
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Play aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {open ? "Close" : "Play"}
          </button>
          <a
            href={`https://www.youtube.com/playlist?list=${playlist.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open this playlist on YouTube"
            aria-label={`Open ${playlist.title} on YouTube in a new tab`}
            className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-[var(--text-dim)] transition-colors hover:border-white/25 hover:text-[var(--text)]"
          >
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {open && (
        <div className="mt-3 overflow-hidden rounded-md border border-white/10 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/videoseries?list=${playlist.id}&rel=0&modestbranding=1`}
            title={playlist.title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="aspect-video w-full"
          />
        </div>
      )}
    </div>
  );
}
