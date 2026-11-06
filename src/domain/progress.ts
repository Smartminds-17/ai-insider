// Canonical progress math for a learning path.
//
// There used to be three answers to "how far through is this route?": the
// roadmap divided watched seconds by total duration, the history list divided
// watched videos by total videos, and the home page showed neither. They could
// disagree by 40 points on the same path. This module is the single definition
// every screen should use.
//
// Progress is time-based: a 2-hour video watched halfway counts as an hour, so
// a single long lesson still moves the bar. When durations are missing (old
// rows, unknown sources) it falls back to a completed-video ratio.

export interface ProgressVideo {
  durationSec: number;
  farthestPositionSec: number;
  watched?: boolean;
}

export interface PathProgress {
  totalVideos: number;
  watchedVideos: number;
  totalSeconds: number;
  watchedSeconds: number;
  /** 0–100, rounded. */
  percent: number;
}

export function computePathProgress(videos: ProgressVideo[]): PathProgress {
  let totalSeconds = 0;
  let watchedSeconds = 0;
  let watchedVideos = 0;

  for (const video of videos) {
    const duration = Math.max(0, video.durationSec || 0);
    const reached = Math.max(0, video.farthestPositionSec || 0);

    totalSeconds += duration;
    watchedSeconds += Math.min(reached, duration);
    if (video.watched) watchedVideos += 1;
  }

  const ratio =
    totalSeconds > 0
      ? watchedSeconds / totalSeconds
      : videos.length > 0
        ? watchedVideos / videos.length
        : 0;

  return {
    totalVideos: videos.length,
    watchedVideos,
    totalSeconds,
    watchedSeconds,
    percent: clampPercent(Math.round(ratio * 100)),
  };
}

export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

/** Percentage through one video, used by the player / resume bars. */
export function videoPercent(video: {
  durationSec: number;
  lastPositionSec: number;
}): number {
  if (!video.durationSec || video.durationSec <= 0) return 0;
  return clampPercent(Math.round((video.lastPositionSec / video.durationSec) * 100));
}
