import { computePathProgress } from "@/domain/progress";
import type { PathSummary } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";
import { getSystemConfig } from "./getSystemConfig";

// Narrow shape for the query result below, keyed to the fields we actually
// read — see getPath.ts for why this is local rather than Prisma-generated.
interface ProgressRow {
  watched: boolean;
  lastPositionSec: number;
  farthestPositionSec: number;
  updatedAt: Date;
}
interface VideoRow {
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string;
  durationSec: number;
  progress: ProgressRow[];
}
interface PathRow {
  id: string;
  title: string;
  prompt: string;
  status: string;
  createdAt: Date;
  topics: {
    topicVideos: {
      video: VideoRow;
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

  // Get anonymous identity TTL from database config (fallback to 45 days)
  const anonymousTtlDays = await getSystemConfig<number>("anonymous_identity_ttl_days") ?? 45;
  const anonymousTtlMs = anonymousTtlDays * 24 * 60 * 60 * 1000;

  const paths = await prisma.learningPath.findMany({
    where: { 
      userId,
      // Keep anonymous paths visible for the lifetime of their identity.
      ...(isAnonymous && {
        createdAt: {
          gte: new Date(Date.now() - anonymousTtlMs)
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

    const entries = videos.map((video) => {
      const progress = video.progress[0];
      return {
        youtubeVideoId: video.youtubeVideoId,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        durationSec: video.durationSec,
        watched: progress?.watched ?? false,
        lastPositionSec: progress?.lastPositionSec ?? 0,
        farthestPositionSec: progress?.farthestPositionSec ?? 0,
        updatedAt: progress?.updatedAt ?? null,
      };
    });

    const progress = computePathProgress(entries);

    // Resume target: the most recently touched lesson that is not finished.
    // Falling back to any started lesson means a path whose final video was
    // completed still has a sensible "open it again" target.
    const started = entries
      .filter((entry) => entry.lastPositionSec > 0)
      .sort(
        (a, b) =>
          (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)
      );
    const resume = started.find((entry) => !entry.watched) ?? started[0] ?? null;

    return {
      id: path.id,
      title: path.title,
      prompt: path.prompt,
      status: path.status as PathSummary["status"],
      createdAt: path.createdAt.toISOString(),
      totalVideos: progress.totalVideos,
      watchedVideos: progress.watchedVideos,
      progressPercent: progress.percent,
      lastWatchedAt: resume?.updatedAt?.toISOString() ?? null,
      resumeVideoId: resume?.youtubeVideoId ?? null,
      resumeVideoTitle: resume?.title ?? null,
      resumeThumbnailUrl: resume?.thumbnailUrl ?? null,
      resumeRemainingSec: resume
        ? Math.max(0, resume.durationSec - resume.lastPositionSec)
        : null,
      topicCount: path.topics.length,
      totalDurationSec: progress.totalSeconds,
      coverThumbnailUrl: videos[0]?.thumbnailUrl ?? null,
    };
  });
}
