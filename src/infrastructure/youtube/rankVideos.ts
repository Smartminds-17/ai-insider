import type { CandidateVideo, RankedVideo } from "@/domain/types";

// Prefer full tutorials over snack-size clips. YouTube "long" is >20 min;
// we further reward 30–90 minute lessons and still accept multi-hour courses.

const MIN_SOLID_SEC = 12 * 60;
const IDEAL_DURATION_SEC = 45 * 60;
const COURSE_OK_SEC = 3 * 60 * 60;
const MAX_AGE_DAYS = 365 * 5;

function normalize(value: number, max: number): number {
  return Math.min(value / max, 1);
}

export function scoreVideo(video: CandidateVideo): number {
  if (video.durationSec > 0 && video.durationSec < MIN_SOLID_SEC) {
    return 0;
  }

  const viewScore = normalize(Math.log10(video.viewCount + 1), 7);

  let durationScore: number;
  if (video.durationSec <= 0) {
    durationScore = 0.4;
  } else if (video.durationSec <= IDEAL_DURATION_SEC) {
    const delta = Math.abs(video.durationSec - IDEAL_DURATION_SEC);
    durationScore = 1 - normalize(delta, IDEAL_DURATION_SEC);
  } else if (video.durationSec <= COURSE_OK_SEC) {
    durationScore = 0.95;
  } else {
    durationScore = 0.7;
  }

  const ageDays = (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = 1 - normalize(ageDays, MAX_AGE_DAYS) * 0.5;

  return viewScore * 0.4 + durationScore * 0.45 + recencyScore * 0.15;
}

export function rankVideos(candidates: CandidateVideo[], topN = 5): RankedVideo[] {
  const scored = candidates
    .map((video) => ({ ...video, score: scoreVideo(video) }))
    .sort((a, b) => b.score - a.score);

  const solid = scored.filter((v) => v.score > 0);
  const pool = solid.length >= Math.min(2, topN) ? solid : scored;

  return pool.slice(0, topN);
}
