import type { CandidateVideo } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// In-memory cache to avoid searching for the same topic multiple times
// Cached for 1 hour to reduce API calls
const searchCache = new Map<string, { data: CandidateVideo[]; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const PERSISTENT_CACHE_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

// Parses ISO 8601 durations like "PT14M32S" into seconds.
function parseIsoDuration(iso: string): number {
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

export async function searchVideosForTopic(
  topic: string,
  maxResults = 12
): Promise<CandidateVideo[]> {
  // Check cache first to avoid redundant API calls
  const normalizedTopic = topic.trim().toLocaleLowerCase();
  const cacheKey = `${normalizedTopic}:${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const persistentCache = await prisma.youTubeTopicCache.findUnique({
    where: { topicKey: cacheKey },
  });
  if (persistentCache && Date.now() - persistentCache.cachedAt.getTime() < PERSISTENT_CACHE_TTL) {
    const videos = persistentCache.videos as unknown as CandidateVideo[];
    searchCache.set(cacheKey, { data: videos, timestamp: Date.now() });
    return videos;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error("YouTube sourcing is unavailable: YOUTUBE_API_KEY is not configured.");
    }

    // YouTube search and details calls consume provider quota. This limiter only
    // serializes requests within this process; it is not a daily quota guard.
    try {
      // Wait for rate limiter with timeout
      await youtubeRateLimiter.acquire();
      
      const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("q", `${topic} tutorial`);
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("maxResults", String(maxResults));
      searchUrl.searchParams.set("relevanceLanguage", "en");
      searchUrl.searchParams.set("key", apiKey);

      const searchRes = await fetchWithRetry(searchUrl.toString());
      
      if (searchRes.status === 429) {
        throw new Error("YouTube API rate limit reached while sourcing learning videos.");
      }

      if (!searchRes.ok) {
        throw new Error(`YouTube search failed with status ${searchRes.status}.`);
      }

      const searchData = await searchRes.json();
      const videoIds: string[] = searchData.items
        .map((item: { id: { videoId?: string } }) => item.id.videoId)
        .filter(Boolean);

      if (videoIds.length === 0) {
        throw new Error(`No YouTube videos found for topic: ${topic}`);
      }

      // Wait 1s between search and details call to avoid overwhelming the API
      await delay(1000);

      // Second call needed: search.list doesn't return duration/viewCount, only
      // videos.list (statistics + contentDetails parts) does.
      const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
      detailsUrl.searchParams.set("part", "snippet,statistics,contentDetails");
      detailsUrl.searchParams.set("id", videoIds.join(","));
      detailsUrl.searchParams.set("key", apiKey);

      const detailsRes = await fetchWithRetry(detailsUrl.toString());
      
      if (detailsRes.status === 429) {
        throw new Error("YouTube API quota was reached while loading video details.");
      }

      if (!detailsRes.ok) {
        throw new Error(`YouTube video details failed with status ${detailsRes.status}.`);
      }

      const detailsData = await detailsRes.json();
      const results = detailsData.items.map(
        (item: {
          id: string;
          snippet: {
            title: string;
            channelTitle: string;
            thumbnails: { medium?: { url: string }; default: { url: string } };
            publishedAt: string;
          };
          statistics: { viewCount?: string };
          contentDetails: { duration: string };
        }) => ({
          youtubeVideoId: item.id,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default.url,
          durationSec: parseIsoDuration(item.contentDetails.duration),
          viewCount: Number(item.statistics.viewCount ?? 0),
          publishedAt: item.snippet.publishedAt,
        })
      );

      // Cache the successful results
      searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
      await prisma.youTubeTopicCache.upsert({
        where: { topicKey: cacheKey },
        update: { topic, videos: JSON.parse(JSON.stringify(results)), cachedAt: new Date() },
        create: { topicKey: cacheKey, topic, videos: JSON.parse(JSON.stringify(results)) },
      });
      console.log(`Successfully fetched ${results.length} real videos for topic: ${topic}`);
      return results;

    } catch (err) {
      console.warn("YouTube sourcing failed for topic:", topic, err);
      throw err;
    }
}
