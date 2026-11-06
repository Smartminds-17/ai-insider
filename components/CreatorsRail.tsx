import type { PathView } from "@/domain/types";
import { ArrowUpRight } from "lucide-react";
import { channelUrl } from "./ChannelLink";

interface CreatorsRailProps {
  videos: PathView["topics"][number]["videos"];
}

interface Creator {
  key: string;
  channelTitle: string;
  channelId: string | null;
  channelHandle: string | null;
  channelAvatarUrl: string | null;
  lessonCount: number;
}

/**
 * "Who teaches this route" — deduped YouTube channels behind the lessons.
 * Every card leaves the app for the real channel page, so we never imply the
 * creator has an account here.
 */
export default function CreatorsRail({ videos }: CreatorsRailProps) {
  const byChannel = new Map<string, Creator>();

  for (const video of videos) {
    const key = video.channelId ?? video.channelTitle;
    const existing = byChannel.get(key);
    if (existing) {
      existing.lessonCount += 1;
      continue;
    }
    byChannel.set(key, {
      key,
      channelTitle: video.channelTitle,
      channelId: video.channelId ?? null,
      channelHandle: video.channelHandle ?? null,
      channelAvatarUrl: video.channelAvatarUrl ?? null,
      lessonCount: 1,
    });
  }

  const creators = [...byChannel.values()].sort(
    (a, b) => b.lessonCount - a.lessonCount || a.channelTitle.localeCompare(b.channelTitle)
  );

  if (creators.length === 0) return null;

  return (
    <section className="section-rail mb-12" aria-labelledby="creators-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="legend-label legend-label--sage mb-2">Source channels</p>
          <h3 id="creators-heading" className="font-display text-xl font-medium leading-tight">
            Who teaches this route
          </h3>
        </div>
        <p className="text-xs text-[var(--text-dim)]">Profiles open on YouTube</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {creators.map((creator) => (
          <a
            key={creator.key}
            href={channelUrl(creator)}
            target="_blank"
            rel="noopener noreferrer"
            className="surface-card group/creator flex w-60 shrink-0 items-center gap-3 p-3 transition-colors hover:border-white/25"
            aria-label={`Open ${creator.channelTitle} on YouTube in a new tab`}
          >
            {creator.channelAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.channelAvatarUrl}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-10 shrink-0 rounded-full bg-white/10 object-cover ring-1 ring-white/10"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-sm uppercase ring-1 ring-white/10"
              >
                {creator.channelTitle.slice(0, 1)}
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-tight">
                {creator.channelTitle}
              </span>
              <span className="mt-0.5 block font-mono text-[11px] text-[var(--text-dim)]">
                {creator.lessonCount} lesson{creator.lessonCount === 1 ? "" : "s"} here
              </span>
            </span>

            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-[var(--text-dim)] transition-colors group-hover/creator:text-[var(--text)]"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
