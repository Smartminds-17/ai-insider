import type { GoalStatus, GoalSummary, PathStatus } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";

interface TopicVideoRow {
  videoId: string;
}

interface TopicRow {
  topicVideos: TopicVideoRow[];
}

interface PathRow {
  id: string;
  status: string;
  topics: TopicRow[];
}

interface GoalRow {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  status: string;
  createdAt: Date;
  LearningPath: PathRow[]; // Match Prisma's capitalized relation name
}

interface ProgressRow {
  videoId: string;
}

export async function listGoals(userId: string): Promise<GoalSummary[]> {
  const rawGoals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      LearningPath: { // Correct Prisma relation name (capitalized model from schema)
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

  const goals = rawGoals as unknown as GoalRow[];

  const videoIds = goals.flatMap((g) =>
    g.LearningPath.flatMap((p) => p.topics.flatMap((t) => t.topicVideos.map((tv) => tv.videoId)))
  );
  const progressRows = videoIds.length
    ? ((await prisma.progress.findMany({
        where: { userId, videoId: { in: videoIds }, watched: true },
      })) as unknown as ProgressRow[])
    : [];
  const watchedSet = new Set(progressRows.map((p) => p.videoId));

  return goals.map((g) => {
    const path = g.LearningPath[0] ?? null; // Match updated Prisma relation name
    const allVideoIds = path
      ? path.topics.flatMap((t: any) => t.topicVideos.map((tv: any) => tv.videoId)) // Add explicit any to resolve implicit type errors
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
      watchedCount: allVideoIds.filter((id) => watchedSet.has(id)).length,
      totalVideos: allVideoIds.length,
    };
  });
}