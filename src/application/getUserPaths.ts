import type { PathSummary } from "@/domain/types";
import { ANONYMOUS_IDENTITY_TTL_SECONDS } from "@/infrastructure/auth/getOrCreateUserId";
import { prisma } from "@/infrastructure/db/prisma";

// Narrow shape for the query result below, keyed to the fields we actually
// read — see getPath.ts for why this is local rather than Prisma-generated.
interface PathRow {
  id: string;
  title: string;
  prompt: string;
  status: string;
  createdAt: Date;
  topics: {
    topicVideos: {
      video: {
        progress: { watched: boolean }[];
      };
    }[];
  }[];
}

export async function getUserPaths(userId: string): Promise<PathSummary[]> {
  // Check if current user is anonymous (no email)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });
  const isAnonymous = !user?.email;

  const paths = await prisma.learningPath.findMany({
    where: { 
      userId,
      // Keep anonymous paths visible for the lifetime of their identity.
      ...(isAnonymous && {
        createdAt: {
          gte: new Date(Date.now() - ANONYMOUS_IDENTITY_TTL_SECONDS * 1000)
        }
      })
    },
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

  return (paths as unknown as PathRow[]).map((path) => {
    const videos = path.topics.flatMap((t) => t.topicVideos.map((tv) => tv.video));
    const totalVideos = videos.length;
    const watchedVideos = videos.filter((v) => v.progress.some((p) => p.watched)).length;

    return {
      id: path.id,
      title: path.title,
      prompt: path.prompt,
      status: path.status as PathSummary["status"],
      createdAt: path.createdAt.toISOString(),
      totalVideos,
      watchedVideos,
    };
  });
}
