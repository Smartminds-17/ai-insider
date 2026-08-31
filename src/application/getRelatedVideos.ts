import { searchVideosForTopic } from "@/infrastructure/youtube/youtubeClient";
import { rankVideos } from "@/infrastructure/youtube/rankVideos";
import type { RankedVideo } from "@/domain/types";

// Deliberately separate from generatePath's per-topic sourcing: this is one
// broader search for the overall field, not gated behind path progress, and
// not cached to the DB — it's inspirational/exploratory, not core content.
export async function getRelatedVideos(field: string, count = 4): Promise<RankedVideo[]> {
  const candidates = await searchVideosForTopic(`${field} inspiring talk highlights`, 10);
  return rankVideos(candidates, count);
}
