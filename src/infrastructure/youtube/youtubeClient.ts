import type { CandidateVideo } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// In-memory cache to avoid searching for the same topic multiple times
// Cached for 1 hour to reduce API calls
const searchCache = new Map<string, { data: CandidateVideo[]; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const PERSISTENT_CACHE_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

// Circuit breaker for YouTube API failures - stop making requests for 5 minutes after failures
let youtubeFailed = false;
let youtubeFailTime = 0;
const CIRCUIT_BREAKER_TTL = 5 * 60 * 1000; // 5 minutes

// Parses ISO 8601 durations like "PT14M32S" into seconds.
export function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

// Retry with exponential backoff for rate limits (429) and transient errors
async function fetchWithRetry(url: string, retries = 5, baseDelay = 2000): Promise<Response> {
  try {
    // Add 30 second timeout to avoid hanging connections that cause ETIMEDOUT
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.status === 429) {
      // Handle rate limit with exponential backoff
      if (retries > 0) {
        const delay = baseDelay * Math.pow(2, 5 - retries); // 2s, 4s, 8s, 16s, 32s
        console.log(`YouTube rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, retries - 1, baseDelay);
      }
    }
    return response;
  } catch (err) {
    // Handle network errors, timeouts, and aborts with retry
    if (retries > 0) {
      const delay = baseDelay * Math.pow(2, 5 - retries);
      const error = err as Error;
      console.log(`Network/timeout error (${error.message}), retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, baseDelay);
    }
    throw err;
  }
}

// Serialize calls inside this process to avoid unnecessary concurrent quota use.
type QueuedRequest = {
  resolve: () => void;
  reject: (error: Error) => void;
  addedAt: number;
};

class YouTubeRateLimiter {
  private isProcessing = false;
  private queue: QueuedRequest[] = [];
  private lastRequestTime = 0;
  private readonly MIN_DELAY_BETWEEN_REQUESTS = 1000;

  constructor() {
    console.log("YouTube request concurrency limiter initialized (one call at a time, one-second spacing)");
  }

  // Process the queue one at a time, never run concurrent requests
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // If we need to wait before processing next, wait and then continue
      if (timeSinceLastRequest < this.MIN_DELAY_BETWEEN_REQUESTS) {
        const waitTime = this.MIN_DELAY_BETWEEN_REQUESTS - timeSinceLastRequest;
        console.log(`YouTube quota: waiting ${Math.round(waitTime/1000)} seconds for next search...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Process the next request
      const next = this.queue.shift();
      if (next) {
        this.lastRequestTime = Date.now();
        next.resolve();
      }
    }

    this.isProcessing = false;
  }

  // Wait for your turn in the queue
  async acquire(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Add to queue
      this.queue.push({
        resolve,
        reject,
        addedAt: Date.now()
      });

      // Start processing if not already
      this.processQueue();

      // 25 minute timeout - way more than enough for free tier
      setTimeout(() => {
        const index = this.queue.findIndex(req => req.resolve === resolve);
        if (index !== -1) {
          this.queue.splice(index, 1);
          reject(new Error("Rate limiter timeout (waited 25 minutes for YouTube quota)"));
        }
      }, 25 * 60 * 1000);
    });
  }
}

// Singleton instance; this limit is process-local, not shared across deployments.
const youtubeRateLimiter = new YouTubeRateLimiter();

// Exponential backoff for retries
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Clear entire cache on server startup to ensure fresh searches every time the app restarts
searchCache.clear();
console.log("✅ YouTube search cache cleared on server startup");

// Cache cleanup - run every 15 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
}, 15 * 60 * 1000);

// Export a function to manually clear the cache if needed
export function clearYouTubeCache() {
  searchCache.clear();
  console.log("✅ Manual YouTube cache clear complete");
}

export interface ChannelDetails {
  channelId: string;
  handle: string | null;
  avatarUrl: string | null;
}

/**
 * Resolve display metadata for YouTube channels in batches of 50.
 * `channels.list` costs 1 quota unit per request, so a whole route's creators
 * typically costs a single unit.
 */
export async function fetchChannelDetails(channelIds: string[]): Promise<ChannelDetails[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const unique = [...new Set(channelIds.filter(Boolean))];
  if (!apiKey || unique.length === 0) return [];

  const details: ChannelDetails[] = [];

  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const url = new URL(`${YOUTUBE_API_BASE}/channels`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    try {
      await youtubeRateLimiter.acquire();
      const res = await fetchWithRetry(url.toString());
      if (!res.ok) {
        console.warn(`YouTube channel details failed with status ${res.status}.`);
        continue;
      }
      const data = await res.json();
      for (const item of data.items ?? []) {
        const thumbnails = item.snippet?.thumbnails;
        details.push({
          channelId: item.id,
          handle: item.snippet?.customUrl ?? null,
          avatarUrl:
            thumbnails?.medium?.url ??
            thumbnails?.default?.url ??
            null,
        });
      }
    } catch (err) {
      console.warn("Failed to fetch YouTube channel details:", err);
    }
  }

  return details;
}

export interface ChannelPlaylist {
  id: string;
  title: string;
  description: string | null;
  channelTitle: string;
  itemCount: number;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

/**
 * List the public playlists a channel has curated. One quota unit per channel
 * (`playlists.list`), which is why callers probe only the channels already
 * present on the route instead of running a `search.list` (100 units).
 */
export async function fetchChannelPlaylists(
  channelId: string,
  maxResults = 25
): Promise<ChannelPlaylist[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !channelId) return [];

  const url = new URL(`${YOUTUBE_API_BASE}/playlists`);
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, maxResults))));
  url.searchParams.set("key", apiKey);

  try {
    await youtubeRateLimiter.acquire();
    const res = await fetchWithRetry(url.toString());
    if (!res.ok) {
      console.warn(`YouTube playlists for ${channelId} failed with status ${res.status}.`);
      return [];
    }

    const data = await res.json();
    return (data.items ?? []).map(
      (item: {
        id: string;
        snippet: {
          title: string;
          description?: string;
          channelTitle: string;
          publishedAt?: string;
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        };
        contentDetails?: { itemCount?: number };
      }) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description ?? null,
        channelTitle: item.snippet.channelTitle,
        itemCount: Number(item.contentDetails?.itemCount ?? 0),
        thumbnailUrl:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          null,
        publishedAt: item.snippet.publishedAt ?? null,
      })
    );
  } catch (err) {
    console.warn(`Failed to fetch playlists for channel ${channelId}:`, err);
    return [];
  }
}


export async function getPlaylistVideos(playlistId: string, apiKey: string): Promise<CandidateVideo[]> {
  const playlistItemsUrl = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
  playlistItemsUrl.searchParams.set("part", "contentDetails");
  playlistItemsUrl.searchParams.set("playlistId", playlistId);
  playlistItemsUrl.searchParams.set("maxResults", "50");
  playlistItemsUrl.searchParams.set("key", apiKey);

  const playlistItemsRes = await fetchWithRetry(playlistItemsUrl.toString());
  if (!playlistItemsRes.ok) {
    throw new Error(`Failed to fetch playlist items with status ${playlistItemsRes.status}`);
  }

  const playlistItemsData = await playlistItemsRes.json();
  const videoIds: string[] = playlistItemsData.items
    .map((item: { contentDetails: { videoId?: string } }) => item.contentDetails.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) {
    return [];
  }

  const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
  detailsUrl.searchParams.set("part", "snippet,statistics,contentDetails");
  detailsUrl.searchParams.set("id", videoIds.join(","));
  detailsUrl.searchParams.set("key", apiKey);

  const detailsRes = await fetchWithRetry(detailsUrl.toString());
  if (!detailsRes.ok) {
    throw new Error(`YouTube video details failed with status ${detailsRes.status}.`);
  }

  const detailsData = await detailsRes.json();
  return detailsData.items.map(
    (item: {
      id: string;
      snippet: {
        title: string;
        channelTitle: string;
        channelId: string;
        publishedAt: string;
      };
      statistics: { viewCount?: string };
      contentDetails: { duration: string };
    }) => ({
      youtubeVideoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId ?? null,
      // Use YouTube's native WebP thumbnail (hq720 provides 1280x720 WebP, 30-50% smaller than JPG)
      thumbnailUrl: `https://i.ytimg.com/vi_webp/${item.id}/hq720.webp`,
      durationSec: parseIsoDuration(item.contentDetails.duration),
      viewCount: Number(item.statistics.viewCount ?? 0),
      publishedAt: item.snippet.publishedAt,
    })
  );
}

export async function searchVideosForTopic(
  topic: string,
  maxResults = 12
): Promise<CandidateVideo[]> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`YouTube search for "${topic}" timed out after 2 minutes`)), 120000)
  );

  const searchPromise = (async () => {
    const playlistId = topic.match(/list=([\w-]+)/)?.[1];

    // Check circuit breaker first
    if (youtubeFailed && Date.now() - youtubeFailTime < CIRCUIT_BREAKER_TTL) {
      console.log(`⚠️ YouTube circuit breaker open, using cached results for: ${topic}`);
      const cacheKey = playlistId ? `playlist:${playlistId}` : `${topic.trim().toLocaleLowerCase()}:${maxResults}`;
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      const persistentCache = await prisma.youTubeTopicCache.findUnique({ where: { topicKey: cacheKey } });
      if (persistentCache && Date.now() - persistentCache.cachedAt.getTime() < PERSISTENT_CACHE_TTL) {
        const videos = persistentCache.videos as unknown as CandidateVideo[];
        searchCache.set(cacheKey, { data: videos, timestamp: Date.now() });
        return videos;
      }
      return [];
    }
    
    if (youtubeFailed && Date.now() - youtubeFailTime >= CIRCUIT_BREAKER_TTL) {
      console.log("🔄 YouTube circuit breaker reset, attempting API calls again");
      youtubeFailed = false;
    }

    const cacheKey = playlistId ? `playlist:${playlistId}` : `${topic.trim().toLocaleLowerCase()}:${maxResults}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const persistentCache = await prisma.youTubeTopicCache.findUnique({ where: { topicKey: cacheKey } });
    if (persistentCache && Date.now() - persistentCache.cachedAt.getTime() < PERSISTENT_CACHE_TTL) {
      const videos = persistentCache.videos as unknown as CandidateVideo[];
      searchCache.set(cacheKey, { data: videos, timestamp: Date.now() });
      return videos;
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error("YouTube sourcing is unavailable: YOUTUBE_API_KEY is not configured.");
    }

    try {
      await youtubeRateLimiter.acquire();
      
      let results: CandidateVideo[];

      if (playlistId) {
        console.log(`Fetching videos for playlist: ${playlistId}`);
        results = await getPlaylistVideos(playlistId, apiKey);
      } else {
        const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
        searchUrl.searchParams.set("part", "snippet");
        searchUrl.searchParams.set("q", `${topic} tutorial`);
        searchUrl.searchParams.set("type", "video");
        searchUrl.searchParams.set("maxResults", String(maxResults));
        searchUrl.searchParams.set("relevanceLanguage", "en");
        searchUrl.searchParams.set("key", apiKey);

        const searchRes = await fetchWithRetry(searchUrl.toString());
        if (searchRes.status === 429) throw new Error("YouTube API rate limit reached.");
        if (!searchRes.ok) throw new Error(`YouTube search failed with status ${searchRes.status}.`);

        const searchData = await searchRes.json();
        const videoIds: string[] = searchData.items
          .map((item: { id: { videoId?: string } }) => item.id.videoId)
          .filter(Boolean);

        if (videoIds.length === 0) {
          throw new Error(`No YouTube videos found for topic: ${topic}`);
        }

        await delay(1000);

        const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
        detailsUrl.searchParams.set("part", "snippet,statistics,contentDetails");
        detailsUrl.searchParams.set("id", videoIds.join(","));
        detailsUrl.searchParams.set("key", apiKey);

        const detailsRes = await fetchWithRetry(detailsUrl.toString());
        if (detailsRes.status === 429) throw new Error("YouTube API quota reached on details fetch.");
        if (!detailsRes.ok) throw new Error(`YouTube video details failed with status ${detailsRes.status}.`);

        const detailsData = await detailsRes.json();
        results = detailsData.items.map(
          (item: {
            id: string;
            snippet: {
              title: string;
              channelTitle: string;
              channelId: string;
              publishedAt: string;
            };
            statistics: { viewCount?: string };
            contentDetails: { duration: string };
          }) => ({
            youtubeVideoId: item.id,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            channelId: item.snippet.channelId ?? null,
            // Use YouTube's native WebP thumbnail (hq720 provides 1280x720 WebP, 30-50% smaller than JPG)
            thumbnailUrl: `https://i.ytimg.com/vi_webp/${item.id}/hq720.webp`,
            durationSec: parseIsoDuration(item.contentDetails.duration),
            viewCount: Number(item.statistics.viewCount ?? 0),
            publishedAt: item.snippet.publishedAt,
          })
        );
      }

      searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
      await prisma.youTubeTopicCache.upsert({
        where: { topicKey: cacheKey },
        update: { topic, videos: JSON.parse(JSON.stringify(results)), cachedAt: new Date() },
        create: { topicKey: cacheKey, topic, videos: JSON.parse(JSON.stringify(results)) },
      });
      console.log(`Successfully fetched ${results.length} videos for: ${topic}`);
      return results;

    } catch (err) {
      console.warn("YouTube sourcing failed for:", topic, err);
      youtubeFailed = true;
      youtubeFailTime = Date.now();
      console.log(`⚠️ YouTube circuit breaker triggered - will pause API calls for ${CIRCUIT_BREAKER_TTL/1000/60} minutes`);
      throw err;
    }
  })();

  return Promise.race([searchPromise, timeoutPromise]);
}