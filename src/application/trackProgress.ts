import { prisma } from "@/infrastructure/db/prisma";

export async function setVideoWatched(userId: string, videoId: string, watched: boolean) {
  await prisma.progress.upsert({
    where: { userId_videoId: { userId, videoId } },
    update: { watched, watchedAt: watched ? new Date() : null },
    create: { userId, videoId, watched, watchedAt: watched ? new Date() : null },
  });
}
