import type { CandidateVideo, RankedVideo } from "@/domain/types";

// Strategy pattern: this is the "good algorithm to suggest videos" piece.
// v1 uses cheap metadata-only heuristics (no transcript/LLM classification —
// that's deferred). Swappable later without touching callers.

const IDEAL_DURATION_SEC = 15 * 60; // ~15 min sweet spot for a single-topic tutorial
const MAX_AGE_DAYS = 365 * 3; // videos older than ~3 years score lower (may be outdated)

function normalize(value: number, max: number): number {
  return Math.min(value / max, 1);
}

export function scoreVideo(video: CandidateVideo): number {
  // View count: log-scaled so a 10M-view video doesn't completely dominate
  // a 200K-view video that might actually be a better fit.
  const viewScore = normalize(Math.log10(video.viewCount + 1), 7); // log10(10M) ≈ 7

  // Duration fit: penalize videos far from the ideal length in either direction.
  const durationDelta = Math.abs(video.durationSec - IDEAL_DURATION_SEC);
  const durationScore = 1 - normalize(durationDelta, IDEAL_DURATION_SEC * 2);

  // Recency: newer content scores higher, floors out rather than going to zero.
  const ageDays = (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = 1 - normalize(ageDays, MAX_AGE_DAYS) * 0.7;

  // Weighted sum — views matter most (proxy for community-validated quality),
  // then duration fit, then recency.
  return viewScore * 0.5 + durationScore * 0.3 + recencyScore * 0.2;
}

export function rankVideos(candidates: CandidateVideo[], topN = 2): RankedVideo[] {
  return candidates
    .map((video) => ({ ...video, score: scoreVideo(video) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
