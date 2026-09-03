import { prisma } from "@/infrastructure/db/prisma";

export async function selectTutorial(userId: string, topicId: string, videoId: string) {
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, learningPath: { userId } },
    include: { topicVideos: true },
  });
  if (!topic) return null;

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
