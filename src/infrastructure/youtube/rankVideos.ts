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
const COVERAGE_SCORE_RATIO = 0.65;

// A drop this large (relative to the previous video) marks the point where
// results stop being comparable in quality — cut the list there.
const ELBOW_MIN_DROP = 0.1;

// Uploads whose titles are this similar are treated as the same lesson
// re-published, so they don't inflate the per-topic video count.
const DUPLICATE_TITLE_SIMILARITY = 0.8;

function titleTokens(title: string): Set<string> {
  return new Set(title.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function titlesAreNearDuplicates(a: string, b: string): boolean {
  const left = titleTokens(a);
  const right = titleTokens(b);
  if (left.size === 0 || right.size === 0) return false;

  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  // Containment (not Jaccard): "Rust for beginners" and "Rust for beginners -
  // full course" are the same lesson even though one title is longer.
  return shared / Math.min(left.size, right.size) >= DUPLICATE_TITLE_SIMILARITY;
}

export function rankVideos(candidates: CandidateVideo[], maxVideos = 5, topic = ""): RankedVideo[] {
  const scored = candidates
    .map((video) => ({ ...video, score: scoreVideo(video, topic) }))
    .sort((a, b) => b.score - a.score);

  const solid = scored.filter((v) => v.score > 0);
  const pool = solid.length > 0 ? solid : scored;
  if (pool.length === 0) return [];

  // Collapse near-identical uploads first, so "five videos" never means five
  // copies of the same tutorial.
  const unique: RankedVideo[] = [];
  for (const video of pool) {
    if (!unique.some((kept) => titlesAreNearDuplicates(kept.title, video.title))) {
      unique.push(video);
    }
  }

  // Coverage-based selection: keep whatever scores close to the best
  // candidate, instead of always padding out to a fixed count.
  const topScore = unique[0].score;
  const band = unique.filter((v) => v.score >= topScore * COVERAGE_SCORE_RATIO);
  const limit = Math.min(maxVideos, band.length);

  // Cut at the largest quality cliff inside the band. With a smooth score
  // curve there is no cliff, so the topic gets up to `maxVideos`; when the
  // best result clearly dominates, the list stays short.
  let cutAt = limit;
  let biggestDrop = 0;
  for (let i = 1; i < limit; i++) {
    const previous = band[i - 1].score;
    if (previous <= 0) continue;
    const drop = (previous - band[i].score) / previous;
    if (drop > biggestDrop) {
      biggestDrop = drop;
      cutAt = i;
    }
  }

  const count = biggestDrop >= ELBOW_MIN_DROP ? Math.max(1, cutAt) : limit;
  return band.slice(0, count);
}
