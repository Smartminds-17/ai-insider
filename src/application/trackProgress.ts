import { prisma } from "@/infrastructure/db/prisma";

// Update playback position (called every 5-10 seconds while video is playing).
// There is no manual "mark as watched" toggle — completion is entirely
// derived from how far the player has actually reached.
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

  const existing = await prisma.progress.findUnique({
    where: { userId_videoId: { userId, videoId } },
    select: { farthestPositionSec: true },
  });
  // High-water mark: never goes down, even if the user rewinds or re-watches.
  const farthestPositionSec = Math.max(existing?.farthestPositionSec ?? 0, positionSec);

  await prisma.progress.upsert({
    where: { userId_videoId: { userId, videoId } },
    update: {
      lastPositionSec: positionSec,
      farthestPositionSec,
      watchedSeconds: { increment: deltaSeconds },
      // Auto-set watched if user is almost finished
      ...(isWatched && { watched: true, watchedAt: new Date() })
    },
    create: {
      userId,
      videoId,
      lastPositionSec: positionSec,
      farthestPositionSec,
      watchedSeconds: deltaSeconds,
      watched: isWatched || false,
      watchedAt: isWatched ? new Date() : null,
    },
  });
}
