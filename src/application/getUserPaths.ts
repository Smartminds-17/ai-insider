import type { PathSummary } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";

export async function getUserPaths(userId: string): Promise<PathSummary[]> {
  const paths = await prisma.learningPath.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      topics: {
        include: {
          topicVideos: {
            include: {
              video: {
                include: {
                  progress: { where: { userId } },
                },
              },
            },
          },
        },
      },
    },
  });

  return paths.map((path: any) => {
    const videos = path.topics.flatMap((t: any) => t.topicVideos.map((tv: any) => tv.video));
    const totalVideos = videos.length;
    const watchedVideos = videos.filter((v: any) => v.progress.some((p: any) => p.watched)).length;

    return {
      id: path.id,
      title: path.title,
      prompt: path.prompt,
      status: path.status,
      createdAt: path.createdAt.toISOString(),
      totalVideos,
      watchedVideos,
    };
  });
}