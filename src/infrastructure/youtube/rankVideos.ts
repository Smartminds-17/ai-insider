import type { CandidateVideo, RankedVideo } from "@/domain/types";

// Favor substantive lessons while allowing shorter, focused tutorials.

const MIN_SOLID_SEC = 4 * 60;
const IDEAL_DURATION_SEC = 45 * 60;
const COURSE_OK_SEC = 3 * 60 * 60;
const MAX_AGE_DAYS = 365 * 5;

function normalize(value: number, max: number): number {
  return Math.min(value / max, 1);
}

const TOPIC_STOP_WORDS = new Set(["a", "an", "and", "for", "from", "how", "in", "of", "on", "the", "to", "tutorial", "course"]);

function titleRelevance(title: string, topic: string): number {
  const terms = topic.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const usefulTerms = [...new Set(terms.filter((term) => !TOPIC_STOP_WORDS.has(term)))];
  if (usefulTerms.length === 0) return 0.5;
  const titleTerms = new Set(title.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
  return usefulTerms.filter((term) => titleTerms.has(term)).length / usefulTerms.length;
}

export function scoreVideo(video: CandidateVideo, topic = ""): number {
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

  const relevanceScore = topic ? titleRelevance(video.title, topic) : 0.5;
  return viewScore * 0.35 + durationScore * 0.2 + recencyScore * 0.15 + relevanceScore * 0.3;
}

// Ratio applied to the top scorer to decide which other candidates are
// "genuinely" competitive with it, rather than padding for padding's sake.
const COVERAGE_SCORE_RATIO = 0.55;

export function rankVideos(candidates: CandidateVideo[], maxVideos = 5, topic = ""): RankedVideo[] {
  const scored = candidates
    .map((video) => ({ ...video, score: scoreVideo(video, topic) }))
    .sort((a, b) => b.score - a.score);

  const solid = scored.filter((v) => v.score > 0);
  const pool = solid.length > 0 ? solid : scored;
  if (pool.length === 0) return [];

  // Coverage-based selection: keep whatever scores close to the best
  // candidate, instead of always padding out to a fixed count. If one video
  // comprehensively covers the topic, it can be the entire list — there's no
  // need to also include a shorter "quick version" of the same material.
  const topScore = pool[0].score;
  const kept = pool.filter((v) => v.score >= topScore * COVERAGE_SCORE_RATIO);

  return kept.slice(0, maxVideos);
}
