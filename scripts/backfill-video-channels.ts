// One-off backfill: attach YouTube channel metadata to existing Video rows.
//
//   npx tsx --env-file=.env scripts/backfill-video-channels.ts
//
// 1. videos.list (50 ids per call) -> snippet.channelId
// 2. channels.list (50 ids per call) -> handle + avatar
// Both endpoints cost 1 quota unit per request, so a small catalog is cheap.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API = "https://www.googleapis.com/youtube/v3";

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not set");

  const pending = await prisma.video.findMany({
    where: { channelId: null },
    select: { id: true, youtubeVideoId: true },
  });
  console.log(`Videos missing channelId: ${pending.length}`);

  // 1. video id -> channel id
  const channelIdByVideoId = new Map<string, string>();
  for (let i = 0; i < pending.length; i += 50) {
    const chunk = pending.slice(i, i + 50);
    const url = new URL(`${API}/videos`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", chunk.map((v) => v.youtubeVideoId).join(","));
    url.searchParams.set("key", apiKey);
    const data = await getJson(url.toString());
    for (const item of data.items ?? []) {
      channelIdByVideoId.set(item.id, item.snippet.channelId);
    }
  }

  for (const [youtubeVideoId, channelId] of channelIdByVideoId) {
    await prisma.video.updateMany({
      where: { youtubeVideoId, channelId: null },
      data: { channelId },
    });
  }
  console.log(`Attached channelId to ${channelIdByVideoId.size} videos`);

  // 2. channel id -> handle + avatar
  const channelIds = [
    ...new Set(
      (
        await prisma.video.findMany({
          where: { channelId: { not: null } },
          select: { channelId: true },
        })
      )
        .map((v) => v.channelId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let updated = 0;
  for (let i = 0; i < channelIds.length; i += 50) {
    const chunk = channelIds.slice(i, i + 50);
    const url = new URL(`${API}/channels`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);
    const data = await getJson(url.toString());
    for (const item of data.items ?? []) {
      const thumbnails = item.snippet?.thumbnails;
      const result = await prisma.video.updateMany({
        where: { channelId: item.id },
        data: {
          channelHandle: item.snippet?.customUrl ?? null,
          channelAvatarUrl: thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null,
        },
      });
      updated += result.count;
    }
  }
  console.log(`Updated channel metadata on ${updated} video rows`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
