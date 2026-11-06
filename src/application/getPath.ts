import type { PathView, VideoSource } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";
import { getSystemConfig } from "./getSystemConfig";

// Narrow shapes for the query result below, keyed to the fields we actually
// read. Kept local (rather than relying on Prisma's generated payload types)
// so this file type-checks the same whether or not `prisma generate` has run.
interface VideoRow {
  id: string;
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  channelId: string | null;
  channelHandle: string | null;
  channelAvatarUrl: string | null;
  thumbnailUrl: string;
  durationSec: number;
}
interface TopicVideoRow {
  videoId: string;
  video: VideoRow;
  selected: boolean;
  source: string;
}
interface TopicRow {
  id: string;
  title: string;
  order: number;
  selectedVideoId: string | null;
  playlistId: string | null;
  playlistTitle: string | null;
  playlistChannelTitle: string | null;
  playlistThumbnailUrl: string | null;
  playlistItemCount: number | null;
  topicVideos: TopicVideoRow[];
}
interface ProgressRow {
  videoId: string;
  watched: boolean;
  watchedSeconds: number;
  lastPositionSec: number;
  farthestPositionSec: number;
  updatedAt: Date;
}

export async function getPath(pathId: string, userId: string): Promise<PathView | null> {
  // First check if the current user is an anonymous user (no email)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });
  const isAnonymous = !user?.email;

  // Get anonymous identity TTL from database config (fallback to 45 days)
  const anonymousTtlDays = await getSystemConfig<number>("anonymous_identity_ttl_days") ?? 45;
  const anonymousTtlMs = anonymousTtlDays * 24 * 60 * 60 * 1000;

  const path = await prisma.learningPath.findFirst({
    where: { 
      id: pathId, 
      userId,
      // Keep anonymous paths visible for the lifetime of their identity.
      ...(isAnonymous && {
        createdAt: {
          gte: new Date(Date.now() - anonymousTtlMs)
        }
      })
    },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: {
          topicVideos: {
            orderBy: { order: "asc" },
            include: { video: true },
          },
        },
      },
    },
  });

  if (!path) return null;

  const topics = path.topics as unknown as TopicRow[];

  const videoIds = topics.flatMap((t) => t.topicVideos.map((tv) => tv.videoId));
  const progressRows = (await prisma.progress.findMany({
    where: { userId, videoId: { in: videoIds } },
  })) as unknown as ProgressRow[];
  const watchedSet = new Set(progressRows.filter((p) => p.watched).map((p) => p.videoId));
  const progressByVideoId = new Map(progressRows.map((p) => [p.videoId, p]));

  return {
    id: path.id,
    goalId: path.goalId,
    title: path.title,
    prompt: path.prompt,
    status: path.status,
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      order: t.order,
      selectedVideoId: t.selectedVideoId,
      playlist: t.playlistId
        ? {
            id: t.playlistId,
            title: t.playlistTitle ?? "Suggested playlist",
            channelTitle: t.playlistChannelTitle ?? "",
            thumbnailUrl: t.playlistThumbnailUrl ?? null,
            itemCount: t.playlistItemCount ?? null,
          }
        : null,
      videos: t.topicVideos.map((tv) => ({
        id: tv.video.id,
        youtubeVideoId: tv.video.youtubeVideoId,
        title: tv.video.title,
        channelTitle: tv.video.channelTitle,
        channelId: tv.video.channelId ?? null,
        channelHandle: tv.video.channelHandle ?? null,
        channelAvatarUrl: tv.video.channelAvatarUrl ?? null,
        thumbnailUrl: tv.video.thumbnailUrl,
        durationSec: tv.video.durationSec,
        watched: watchedSet.has(tv.video.id),
        watchedSeconds: progressByVideoId.get(tv.video.id)?.watchedSeconds ?? 0,
        lastPositionSec: progressByVideoId.get(tv.video.id)?.lastPositionSec ?? 0,
        farthestPositionSec: progressByVideoId.get(tv.video.id)?.farthestPositionSec ?? 0,
        lastWatchedAt: progressByVideoId.get(tv.video.id)?.updatedAt?.toISOString() ?? null,
        selected: tv.selected,
        source: tv.source as VideoSource,
      })),
    })),
  };
}