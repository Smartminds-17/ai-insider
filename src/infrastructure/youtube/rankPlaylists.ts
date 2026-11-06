// Deterministic ranking for candidate playlists. Gemini quota is reserved for
// syllabus generation (a handful of requests per day), so playlist choice is a
// transparent token-overlap score instead of another LLM call.

export interface PlaylistCandidate {
  id: string;
  title: string;
  description?: string | null;
  channelTitle: string;
  itemCount: number;
  thumbnailUrl?: string | null;
  publishedAt?: string | null;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "from",
  "your", "you", "my", "our", "this", "that", "these", "those", "it", "its",
  "how", "what", "why", "when", "part", "pt", "vol", "volume", "ep", "episode",
  "full", "complete", "course", "tutorial", "tutorials", "guide", "series",
  "learn", "learning", "beginners", "beginner", "basics", "intro", "introduction",
  "class", "classes", "lesson", "lessons", "masterclass", "training", "study",
  "new", "updated", "latest", "official", "playlist", "videos", "video",
]);

const GENERIC_TITLES = /^(uploads?|all videos|shorts|livestreams?|videos|clips)$/i;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .map((token) => token.replace(/^[.]+|[.]+$/g, ""))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * How well a playlist fits a waypoint. 0 = unusable, ~0.9 = near-exact title
 * match with a course-sized item count.
 *
 *   title overlap  0.62
 *   description    0.08
 *   phrase match   0.20
 *   size sanity    0.10
 */
export function scorePlaylist(playlist: PlaylistCandidate, topicTitle: string): number {
  if (GENERIC_TITLES.test(playlist.title.trim())) return 0;
  if (playlist.itemCount < 2) return 0;

  const topicTokens = tokenize(topicTitle);
  if (topicTokens.length === 0) return 0;

  const titleTokens = new Set(tokenize(playlist.title));
  const descriptionTokens = new Set(tokenize(playlist.description ?? ""));

  const titleHits = topicTokens.filter((token) => titleTokens.has(token)).length;
  const descriptionHits = topicTokens.filter((token) => descriptionTokens.has(token)).length;
  const titleScore = titleHits / topicTokens.length;
  const descriptionScore = descriptionHits / topicTokens.length;

  const normalizedTitle = normalize(playlist.title);
  const normalizedTopic = normalize(topicTitle);
  const phraseScore =
    normalizedTitle.includes(normalizedTopic) || normalizedTopic.includes(normalizedTitle) ? 1 : 0;

  // A curated arc is better than a 400-video channel dump or a 2-video stub.
  const { itemCount } = playlist;
  let sizeScore = 0;
  if (itemCount >= 4 && itemCount <= 30) sizeScore = 1;
  else if (itemCount <= 60) sizeScore = 0.6;
  else if (itemCount <= 150) sizeScore = 0.25;
  else if (itemCount === 3) sizeScore = 0.3;

  return titleScore * 0.62 + descriptionScore * 0.08 + phraseScore * 0.2 + sizeScore * 0.1;
}

/**
 * Pick the best playlist for a waypoint. Returns [] when nothing clears the bar,
 * which is intentional: an unrelated playlist is worse than no playlist.
 */
export function rankPlaylists<T extends PlaylistCandidate>(
  playlists: T[],
  topicTitle: string,
  limit = 1,
  minScore = 0.34
): T[] {
  return playlists
    .map((playlist) => ({ playlist, score: scorePlaylist(playlist, topicTitle) }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.playlist);
}
