import type { CandidateVideo } from "@/domain/types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// Parses ISO 8601 durations like "PT14M32S" into seconds.
function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

// Mock results so the app is runnable/demoable without a YouTube API key.
// Replace by setting YOUTUBE_API_KEY in .env — real search takes over automatically.
function mockCandidates(topic: string): CandidateVideo[] {
  return Array.from({ length: 5 }).map((_, i) => ({
    youtubeVideoId: `mock-${topic.replace(/\s+/g, "-")}-${i}`,
    title: `${topic} — Full Tutorial ${i + 1}`,
    channelTitle: `Sample Channel ${i + 1}`,
    thumbnailUrl: "https://placehold.co/320x180?text=" + encodeURIComponent(topic),
    durationSec: 600 + i * 300,
    viewCount: 500000 - i * 80000,
    publishedAt: new Date(Date.now() - i * 30 * 24 * 3600 * 1000).toISOString(),
  }));
}

export async function searchVideosForTopic(
  topic: string,
  maxResults = 8
): Promise<CandidateVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return mockCandidates(topic);
  }

  const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", `${topic} tutorial`);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", String(maxResults));
  searchUrl.searchParams.set("relevanceLanguage", "en");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    throw new Error(`YouTube search failed: ${searchRes.status}`);
  }
  const searchData = await searchRes.json();
  const videoIds: string[] = searchData.items
    .map((item: { id: { videoId?: string } }) => item.id.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  // Second call needed: search.list doesn't return duration/viewCount, only
  // videos.list (statistics + contentDetails parts) does.
  const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
  detailsUrl.searchParams.set("part", "snippet,statistics,contentDetails");
  detailsUrl.searchParams.set("id", videoIds.join(","));
  detailsUrl.searchParams.set("key", apiKey);

  const detailsRes = await fetch(detailsUrl.toString());
  if (!detailsRes.ok) {
    throw new Error(`YouTube video details failed: ${detailsRes.status}`);
  }
  const detailsData = await detailsRes.json();

  return detailsData.items.map(
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
}
