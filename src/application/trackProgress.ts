import { prisma } from "@/infrastructure/db/prisma";

export async function setVideoWatched(userId: string, videoId: string, watched: boolean) {
  await prisma.progress.upsert({
    where: { userId_videoId: { userId, videoId } },
    update: { watched, watchedAt: watched ? new Date() : null },
    create: { userId, videoId, watched, watchedAt: watched ? new Date() : null },
  });
}

// Update playback position (called every 5-10 seconds while video is playing)
export async function updatePlaybackPosition(
  userId: string,
  videoId: string,
  positionSec: number,
  deltaSeconds: number
) {
  // Auto-mark as watched if user is >95% through the video
  const videoDuration = await prisma.video.findUnique({
    where: { id: videoId },
    select: { durationSec: true }
  });
  const isWatched = videoDuration?.durationSec && positionSec > videoDuration.durationSec * 0.95;

  await prisma.progress.upsert({
    where: { userId_videoId: { userId, videoId } },
    update: { 
      lastPositionSec: positionSec,
      watchedSeconds: { increment: deltaSeconds },
      // Auto-set watched if user is almost finished
      ...(isWatched && { watched: true, watchedAt: new Date() })
    },
    create: {
      userId,
      videoId,
      lastPositionSec: positionSec,
      watchedSeconds: deltaSeconds,
      watched: isWatched || false,
      watchedAt: isWatched ? new Date() : null,
    },
  });
}
