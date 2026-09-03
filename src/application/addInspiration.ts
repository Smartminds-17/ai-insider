import { prisma } from "@/infrastructure/db/prisma";
import type { RankedVideo } from "@/domain/types";

export async function addInspirationToPath(
  userId: string,
  pathId: string,
  video: RankedVideo
): Promise<{ added: boolean; reason?: string; topicId?: string }> {
  const path = await prisma.learningPath.findFirst({
    where: { id: pathId, userId },
    include: {
      topics: { include: { topicVideos: { include: { video: true } } } },
    },
  });
  if (!path) return { added: false, reason: "Path not found" };

  const already = path.topics.some((t) =>
    t.topicVideos.some((tv) => tv.video.youtubeVideoId === video.youtubeVideoId)
  );
  if (already) return { added: false, reason: "Already on this syllabus" };

  const cached = await prisma.video.upsert({
    where: { youtubeVideoId: video.youtubeVideoId },
    update: {
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      durationSec: video.durationSec,
      viewCount: video.viewCount,
      publishedAt: new Date(video.publishedAt),
    },
    create: {
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnailUrl: video.thumbnailUrl,
      durationSec: video.durationSec,
      viewCount: video.viewCount,
      publishedAt: new Date(video.publishedAt),
    },
  });

  const nextOrder = path.topics.reduce((max, t) => Math.max(max, t.order), -1) + 1;
  const topic = await prisma.topic.create({
    data: {
      learningPathId: path.id,
      title: video.title.slice(0, 80),
      order: nextOrder,
      selectedVideoId: cached.id,
    },
  });

  await prisma.topicVideo.create({
    data: {
      topicId: topic.id,
      videoId: cached.id,
      order: 0,
      source: "INSPIRATION",
      selected: true,
    },
  });

  return { added: true, topicId: topic.id };
}
