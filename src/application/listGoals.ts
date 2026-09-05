import type { GoalStatus, GoalSummary, PathStatus } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";

export async function listGoals(userId: string): Promise<GoalSummary[]> {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      paths: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          topics: {
            include: { topicVideos: true },
          },
        },
      },
    },
  });

  const videoIds = goals.flatMap((g: any) =>
    g.paths.flatMap((p: any) => p.topics.flatMap((t: any) => t.topicVideos.map((tv: any) => tv.videoId)))
  );
  const progressRows = videoIds.length
    ? await prisma.progress.findMany({
        where: { userId, videoId: { in: videoIds }, watched: true },
      })
    : [];
  const watchedSet = new Set(progressRows.map((p: any) => p.videoId));

  return goals.map((g: any) => {
    const path = g.paths[0] ?? null;
    const allVideoIds = path
      ? path.topics.flatMap((t: any) => t.topicVideos.map((tv: any) => tv.videoId))
      : [];
    return {
      id: g.id,
      title: g.title,
      prompt: g.prompt,
      status: g.status as GoalStatus,
      createdAt: g.createdAt.toISOString(),
      pathId: path?.id ?? null,
      pathStatus: (path?.status as PathStatus) ?? null,
      topicCount: path?.topics.length ?? 0,
      watchedCount: allVideoIds.filter((id: any) => watchedSet.has(id)).length,
      totalVideos: allVideoIds.length,
    };
  });
}