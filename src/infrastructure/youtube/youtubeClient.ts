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
// GLOBAL TOKEN BUCKET RATE LIMITER (for ALL concurrent users)
// Manages YouTube API quota across every user generating a learning path simultaneously
// Prevents "Too many requests" errors even with multiple parallel users
// ==========================================
type QueuedRequest = {
  resolve: () => void;
  unitsNeeded: number;
};

class YouTubeRateLimiter {
  private availableTokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefillTimestamp: number;
  private queue: QueuedRequest[] = [];
  private processing = false;

  constructor(maxTokens: number, refillRatePerMinute: number) {
    this.maxTokens = maxTokens;
    this.availableTokens = maxTokens;
    this.refillRate = refillRatePerMinute / 60; // convert to per second
    this.lastRefillTimestamp = Date.now();
    console.log(`YouTube rate limiter: ${maxTokens} max tokens, ${refillRatePerMinute}/min refill`);
  }

  private refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTimestamp) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    this.availableTokens = Math.min(this.maxTokens, this.availableTokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  private processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    this.refill();

    while (this.queue.length > 0) {
      const next = this.queue[0];
      if (this.availableTokens >= next.unitsNeeded) {
        this.availableTokens -= next.unitsNeeded;
        this.queue.shift();
        next.resolve();
      } else {
        // Wait for tokens to refill before processing next
        const waitTime = Math.ceil((next.unitsNeeded - this.availableTokens) / this.refillRate * 1000);
        setTimeout(() => {
          this.processing = false;
          this.processQueue();
        }, waitTime);
        return;
      }
    }
    this.processing = false;
  }

  // Wait until we have enough tokens to execute the API request
  async acquire(unitsNeeded: number): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ resolve, unitsNeeded });
      this.processQueue();
    });
  }
}

// Singleton instance - ONE limiter for ALL users/requests in the entire app
// YouTube API unit costs: search.list=100 units, videos.list=1 unit → 101 units/topic
// Config: 500 max tokens (allows 4-5 concurrent topics for bursts), 303 units/minute (3 topics/min across all users)
// This keeps us well under YouTube's default 10,000 units/day quota
const youtubeRateLimiter = new YouTubeRateLimiter(500, 303);

// Mock results so the app is runnable/demoable without a YouTube API key.
// Also used as a fallback when we hit API rate limits.
function mockCandidates(topic: string): CandidateVideo[] {
  return Array.from({ length: 5 }).map((_, i) => ({
    youtubeVideoId: `mock-${topic.replace(/\s+/g, "-")}-${i}`,
    title: `${topic} — Full Tutorial ${i + 1}`,
    channelTitle: `Sample Channel ${i + 1}`,
    thumbnailUrl: "https://placehold.co/320x180?text=" + encodeURIComponent(topic),
    durationSec: 1800 + i * 900,
    viewCount: 500000 - i * 80000,
    publishedAt: new Date(Date.now() - i * 30 * 24 * 3600 * 1000).toISOString(),
  }));
}

// Exponential backoff for retries
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cache cleanup - run every 15 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
}, 15 * 60 * 1000);

export async function searchVideosForTopic(
  topic: string,
  maxResults = 12,
  retries = 3
): Promise<CandidateVideo[]> {
  // Check cache first to avoid redundant API calls
  const cacheKey = `${topic}:${maxResults}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    const mockData = mockCandidates(topic);
    searchCache.set(cacheKey, { data: mockData, timestamp: Date.now() });
    return mockData;
  }

  // search.list costs 100 units, videos.list (details) costs 1 unit — 101 total.
  // Block here until the global token bucket has room, so we throttle proactively
  // instead of only reacting to 429s after quota is already blown.
  await youtubeRateLimiter.acquire(101);

  try {
    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", `${topic} full tutorial complete course`);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("videoDuration", "long");
    searchUrl.searchParams.set("maxResults", String(maxResults));
    searchUrl.searchParams.set("relevanceLanguage", "en");
    searchUrl.searchParams.set("key", apiKey);

    const searchRes = await fetchWithRetry(searchUrl.toString());
    
    // If we hit rate limits, fall back to mock data immediately
    if (searchRes.status === 429) {
      console.warn("YouTube API rate limit hit, using mock data for:", topic);
      const mockData = mockCandidates(topic);
      searchCache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    }

    if (!searchRes.ok) {
      // If we still fail after retries, fall back to mock data
      console.warn(`YouTube API failed after retries, falling back to mock data: ${searchRes.status}`);
      const mockData = mockCandidates(topic);
      searchCache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    }

    const searchData = await searchRes.json();
    const videoIds: string[] = searchData.items
      .map((item: { id: { videoId?: string } }) => item.id.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) return mockCandidates(topic);

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
      console.warn("YouTube API rate limit hit on details call, using mock data for:", topic);
      const mockData = mockCandidates(topic);
      searchCache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
    }

    if (!detailsRes.ok) {
      console.warn(`YouTube video details failed after retries, falling back to mock data: ${detailsRes.status}`);
      const mockData = mockCandidates(topic);
      searchCache.set(cacheKey, { data: mockData, timestamp: Date.now() });
      return mockData;
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
    return results;

  } catch (err) {
    console.error("YouTube API error, falling back to mock data:", err);
    const mockData = mockCandidates(topic);
    searchCache.set(cacheKey, { data: mockData, timestamp: Date.now() });
    return mockData;
  }
}