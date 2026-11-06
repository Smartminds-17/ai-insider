import { ArrowUpRight } from "lucide-react";

interface ChannelLinkProps {
  channelTitle: string;
  channelId?: string | null;
  channelHandle?: string | null;
  channelAvatarUrl?: string | null;
  /** Show the channel name next to the avatar. */
  showName?: boolean;
  /** Avatar size in pixels. */
  size?: number;
  className?: string;
}

/**
 * Resolve the most reliable public page for a channel. The channel id always
 * works; the handle is prettier when YouTube returns one; search is the last
 * resort for legacy rows that have not been backfilled yet.
 */
export function channelUrl({
  channelId,
  channelHandle,
  channelTitle,
}: Pick<ChannelLinkProps, "channelId" | "channelHandle" | "channelTitle">): string {
  if (channelId) return `https://www.youtube.com/channel/${channelId}`;
  if (channelHandle) {
    const handle = channelHandle.startsWith("@") ? channelHandle : `@${channelHandle}`;
    return `https://www.youtube.com/${handle}`;
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(channelTitle)}`;
}

export default function ChannelLink({
  channelTitle,
  channelId,
  channelHandle,
  channelAvatarUrl,
  showName = true,
  size = 22,
  className = "",
}: ChannelLinkProps) {
  return (
    <a
      href={channelUrl({ channelId, channelHandle, channelTitle })}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      title={`Visit ${channelTitle} on YouTube`}
      aria-label={`Visit ${channelTitle} on YouTube in a new tab`}
      className={`group/channel inline-flex min-w-0 items-center gap-1.5 rounded-full text-[var(--text-dim)] transition-colors hover:text-[var(--text)] ${className}`}
    >
      {channelAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={channelAvatarUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="shrink-0 rounded-full bg-white/10 object-cover ring-1 ring-white/10"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid shrink-0 place-items-center rounded-full bg-white/10 font-mono text-[10px] uppercase ring-1 ring-white/10"
          style={{ width: size, height: size }}
        >
          {channelTitle.slice(0, 1)}
        </span>
      )}
      {showName && (
        <span className="hidden truncate text-xs group-hover/channel:underline sm:inline">
          {channelTitle}
        </span>
      )}
      <ArrowUpRight
        aria-hidden="true"
        className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/channel:opacity-70"
      />
    </a>
  );
}
