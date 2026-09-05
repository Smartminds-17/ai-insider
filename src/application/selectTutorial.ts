import { prisma } from "@/infrastructure/db/prisma";

interface TopicVideoRow {
  videoId: string;
}

interface TopicWithVideos {
  topicVideos: TopicVideoRow[];
}

export async function selectTutorial(userId: string, topicId: string, videoId: string) {
  const rawTopic = await prisma.topic.findFirst({
    where: { id: topicId, learningPath: { userId } },
    include: { topicVideos: true },
  });
  if (!rawTopic) return null;

  const topic = rawTopic as unknown as TopicWithVideos;

  const belongs = topic.topicVideos.some((tv) => tv.videoId === videoId);
  if (!belongs) return null;

  await prisma.$transaction([
    prisma.topicVideo.updateMany({
      where: { topicId },
      data: { selected: false },
    }),
    prisma.topicVideo.updateMany({
      where: { topicId, videoId },
      data: { selected: true },
    }),
    prisma.topic.update({
      where: { id: topicId },
      data: { selectedVideoId: videoId },
    }),
  ]);

  return { topicId, videoId };
}