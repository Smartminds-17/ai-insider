import type { CandidateVideo } from "@/domain/types";
import { describe, expect, it } from "vitest";
import { rankVideos } from "./rankVideos";

const publishedAt = new Date().toISOString();

function candidate(
  youtubeVideoId: string,
  title: string,
  viewCount: number,
  durationSec = 45 * 60,
): CandidateVideo {
  return {
    youtubeVideoId,
    title,
    channelTitle: "Test Channel",
    thumbnailUrl: `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
    durationSec,
    viewCount,
    publishedAt,
  };
}

describe("rankVideos", () => {
  it("returns an empty list when there are no candidates", () => {
    expect(rankVideos([], 5, "SQL joins")).toEqual([]);
  });

  it("does not pad a topic out to maxVideos when one result clearly dominates", () => {
    const candidates = [
      candidate("top", "Kubernetes networking explained in depth", 2_000_000),
      candidate("a", "Cooking pasta at home", 500, 10 * 60),
      candidate("b", "Guitar scales for beginners", 400, 10 * 60),
      candidate("c", "Gardening in small spaces", 300, 10 * 60),
      candidate("d", "Chess openings primer", 200, 10 * 60),
    ];

    const ranked = rankVideos(candidates, 5, "Kubernetes");

    expect(ranked.length).toBeLessThan(5);
    expect(ranked[0].youtubeVideoId).toBe("top");
  });

  it("keeps a full set when the quality curve is smooth", () => {
    const candidates = [
      candidate("1", "SQL joins explained with examples", 1_000_000),
      candidate("2", "SQL joins practice for interviews", 950_000),
      candidate("3", "SQL joins types and use cases", 900_000),
      candidate("4", "SQL joins advanced patterns", 850_000),
      candidate("5", "SQL joins performance tuning", 800_000),
      candidate("6", "SQL joins common mistakes", 780_000),
    ];

    expect(rankVideos(candidates, 5, "SQL joins")).toHaveLength(5);
  });

  it("collapses near-duplicate uploads of the same lesson", () => {
    const candidates = [
      candidate("a", "React hooks deep dive tutorial", 1_000_000),
      candidate("b", "React hooks deep dive tutorial", 990_000),
      candidate("c", "React hooks deep dive tutorial 2026", 980_000),
      candidate("d", "React hooks state management guide", 900_000),
      candidate("e", "React hooks useEffect patterns", 800_000),
    ];

    const ranked = rankVideos(candidates, 5, "React hooks");

    expect(ranked.map((v) => v.youtubeVideoId)).not.toContain("b");
    expect(ranked.map((v) => v.youtubeVideoId)).not.toContain("c");

    for (let i = 0; i < ranked.length; i++) {
      for (let j = i + 1; j < ranked.length; j++) {
        const left = new Set(ranked[i].title.toLowerCase().split(/\s+/));
        const right = new Set(ranked[j].title.toLowerCase().split(/\s+/));
        let shared = 0;
        left.forEach((token) => {
          if (right.has(token)) shared += 1;
        });
        expect(shared / Math.min(left.size, right.size)).toBeLessThan(0.8);
      }
    }
  });

  it("never returns more than maxVideos", () => {
    const candidates = Array.from({ length: 12 }, (_, index) =>
      candidate(`v${index}`, `TypeScript generics lesson number ${index}`, 1_000_000 - index * 10_000),
    );

    expect(rankVideos(candidates, 3, "TypeScript generics").length).toBeLessThanOrEqual(3);
  });
});
