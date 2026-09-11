import type { PathView, VideoSource } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";

// Narrow shapes for the query result below, keyed to the fields we actually
// read. Kept local (rather than relying on Prisma's generated payload types)
// so this file type-checks the same whether or not `prisma generate` has run.
interface VideoRow {
  id: string;
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
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
  topicVideos: TopicVideoRow[];
}
interface ProgressRow {
  videoId: string;
  watched: boolean;
  watchedSeconds: number;
  lastPositionSec: number;
}

// 1 hour TTL for anonymous user paths (deleted after refresh/navigate away)
const ANONYMOUS_PATH_TTL_SECONDS = 3600;

export async function getPath(pathId: string, userId: string): Promise<PathView | null> {
  // First check if the current user is an anonymous user (no email)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });
  const isAnonymous = !user?.email;

  const path = await prisma.learningPath.findFirst({
    where: { 
      id: pathId, 
      userId,
      // For anonymous users, only return paths created in the last 1 hour
      ...(isAnonymous && {
        createdAt: {
          gte: new Date(Date.now() - ANONYMOUS_PATH_TTL_SECONDS * 1000)
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
      videos: t.topicVideos.map((tv) => ({
        id: tv.video.id,
        youtubeVideoId: tv.video.youtubeVideoId,
        title: tv.video.title,
        channelTitle: tv.video.channelTitle,
        thumbnailUrl: tv.video.thumbnailUrl,
        durationSec: tv.video.durationSec,
        watched: watchedSet.has(tv.video.id),
        watchedSeconds: progressByVideoId.get(tv.video.id)?.watchedSeconds ?? 0,
        lastPositionSec: progressByVideoId.get(tv.video.id)?.lastPositionSec ?? 0,
        selected: tv.selected,
        source: tv.source as VideoSource,
      })),
    })),
  };
}