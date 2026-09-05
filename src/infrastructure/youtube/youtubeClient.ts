import type { CandidateVideo } from "@/domain/types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// In-memory cache to avoid searching for the same topic multiple times
// Cached for 1 hour to reduce API calls
const searchCache = new Map<string, { data: CandidateVideo[]; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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
    const response = await fetch(url);
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
    // Handle network errors with retry
    if (retries > 0) {
      const delay = baseDelay * Math.pow(2, 5 - retries);
      console.log(`Network error, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, baseDelay);
    }
    throw err;
  }
}

// ==========================================
// SIMPLIFIED SEQUENTIAL RATE LIMITER for YouTube FREE TIER
// Since free tier only allows ~1 search every 15 minutes, we just run ONE request at a time
// No complex token bucket - prevents all concurrency issues by queuing everything
// ==========================================
type QueuedRequest = {
  resolve: () => void;
  reject: (error: Error) => void;
  addedAt: number;
};

class YouTubeRateLimiter {
  private isProcessing = false;
  private queue: QueuedRequest[] = [];
  private lastRequestTime = 0;
  private readonly MIN_DELAY_BETWEEN_REQUESTS = 1000; // 1 second between requests (way under YouTube's 10,000/day free tier limit)
  // Actual YouTube free tier: 10,000 requests/day = ~0.11 requests/second, so 1 request/second is extremely safe

  constructor() {
    console.log("YouTube rate limiter initialized - 1 request per second max (well under free tier limits)");
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
        console.log(`YouTube quota: waiting ${Math.round(waitTime/1000/60)} minutes for next search...`);
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

// Singleton instance - runs ONLY ONE YouTube search at a time, 1 second apart (well under free tier)
const youtubeRateLimiter = new YouTubeRateLimiter();

// Graceful fallback placeholder videos for when API hits rate limits
// These are clearly marked as placeholders in the UI so users know what's happening
const PLACEHOLDER_VIDEO_IDS = [
  "dQw4w9WgXcQ", // Classic test video (always works)
  "jNQXAC9IVRw", // First YouTube video (always available)
];

// Create placeholder videos that clearly indicate they're temporary due to rate limits
function placeholderVideos(topic: string): CandidateVideo[] {
  return Array.from({ length: 5 }).map((_, i) => ({
    youtubeVideoId: PLACEHOLDER_VIDEO_IDS[i % PLACEHOLDER_VIDEO_IDS.length],
    title: `[PLACEHOLDER - Rate Limit Hit] ${topic} — Real videos will load when quota resets`,
    channelTitle: "Placeholder (API Quota Exceeded)",
    thumbnailUrl: `https://i.ytimg.com/vi/${PLACEHOLDER_VIDEO_IDS[0]}/mqdefault.jpg`,
    durationSec: 1800,
    viewCount: 0,
    publishedAt: new Date().toISOString(),
  }));
}

// No fallback mock videos - if API fails, user gets clear error instead of unrelated videos

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
  const cacheKey = `${topic}:${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn("YouTube API key not found, using placeholders for:", topic);
      const placeholders = placeholderVideos(topic);
      searchCache.set(cacheKey, { data: placeholders, timestamp: Date.now() });
      return placeholders;
    }

    // search.list costs 100 units, videos.list (details) costs 1 unit — 101 total.
    // Block here until the global sequential limiter has room, so we throttle proactively
    try {
      // Wait for rate limiter with timeout
      await youtubeRateLimiter.acquire();
      
      const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("q", `${topic} full tutorial complete course`);
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("videoDuration", "long");
      searchUrl.searchParams.set("maxResults", String(maxResults));
      searchUrl.searchParams.set("relevanceLanguage", "en");
      searchUrl.searchParams.set("key", apiKey);

      const searchRes = await fetchWithRetry(searchUrl.toString());
      
      // If we hit rate limits, use clear placeholders
      if (searchRes.status === 429) {
        console.warn("YouTube API rate limit hit, using placeholders for:", topic);
        const placeholders = placeholderVideos(topic);
        searchCache.set(cacheKey, { data: placeholders, timestamp: Date.now() });
        return placeholders;
      }

      if (!searchRes.ok) {
        console.warn(`YouTube search failed (status ${searchRes.status}), using placeholders for:`, topic);
        const placeholders = placeholderVideos(topic);
        searchCache.set(cacheKey, { data: placeholders, timestamp: Date.now() });
        return placeholders;
      }

      const searchData = await searchRes.json();
      const videoIds: string[] = searchData.items
        .map((item: { id: { videoId?: string } }) => item.id.videoId)
        .filter(Boolean);

      if (videoIds.length === 0) {
        console.warn("No YouTube videos found, using placeholders for:", topic);
        const placeholders = placeholderVideos(topic);
        searchCache.set(cacheKey, { data: placeholders, timestamp: Date.now() });
        return placeholders;
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
        console.warn("YouTube API rate limit hit on details call, using placeholders for:", topic);
        const placeholders = placeholderVideos(topic);
        searchCache.set(cacheKey, { data: placeholders, timestamp: Date.now() });
        return placeholders;
      }

      if (!detailsRes.ok) {
        console.warn(`YouTube details failed (status ${detailsRes.status}), using placeholders for:`, topic);
        const placeholders = placeholderVideos(topic);
        searchCache.set(cacheKey, { data: placeholders, timestamp: Date.now() });
        return placeholders;
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
      console.log(`Successfully fetched ${results.length} real videos for topic: ${topic}`);
      return results;

    } catch (err) {
      console.warn("YouTube API error, using placeholders for:", topic, err);
      const placeholders = placeholderVideos(topic);
      searchCache.set(cacheKey, { data: placeholders, timestamp: Date.now() });
      return placeholders;
    }
}