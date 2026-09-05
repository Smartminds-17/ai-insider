import type { PathView, VideoSource } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";

export async function getPath(pathId: string, userId: string): Promise<PathView | null> {
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, userId },
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

  const videoIds = path.topics.flatMap((t: any) => t.topicVideos.map((tv: any) => tv.videoId));
  const progressRows = await prisma.progress.findMany({
    where: { userId, videoId: { in: videoIds } },
  });
  const watchedSet = new Set(progressRows.filter((p: any) => p.watched).map((p: any) => p.videoId));

  return {
    id: path.id,
    goalId: path.goalId,
    title: path.title,
    prompt: path.prompt,
    status: path.status,
    topics: path.topics.map((t: any) => ({
      id: t.id,
      title: t.title,
      order: t.order,
      selectedVideoId: t.selectedVideoId,
      videos: t.topicVideos.map((tv: any) => ({
        id: tv.video.id,
        youtubeVideoId: tv.video.youtubeVideoId,
        title: tv.video.title,
        channelTitle: tv.video.channelTitle,
        thumbnailUrl: tv.video.thumbnailUrl,
        durationSec: tv.video.durationSec,
        watched: watchedSet.has(tv.video.id),
        selected: tv.selected,
        source: tv.source as VideoSource,
      })),
    })),
  };
}