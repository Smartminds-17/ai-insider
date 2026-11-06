// One-off backfill: suggest a playlist for topics created before
// `Topic.playlist*` existed.
//
//   npx tsx --env-file=.env scripts/backfill-topic-playlists.ts
//
// Probes the channels already attached to each topic (max 3), which costs one
// quota unit per channel instead of 100 for a playlist search.

import { PrismaClient } from "@prisma/client";

import { suggestPlaylistForTopic } from "../src/infrastructure/youtube/suggestPlaylist";

const prisma = new PrismaClient();

async function main() {
  const topics = await prisma.topic.findMany({
    where: { playlistId: null },
    select: {
      id: true,
      title: true,
      topicVideos: {
        select: { video: { select: { channelId: true } } },
      },
    },
    orderBy: { order: "asc" },
  });

  console.log(`Topics without a playlist: ${topics.length}`);

  let attached = 0;
  for (const topic of topics) {
    const channelIds = topic.topicVideos
      .map((tv) => tv.video.channelId)
      .filter((id): id is string => Boolean(id));

    if (channelIds.length === 0) {
      console.log(`- ${topic.title}: no channel ids, skipped`);
      continue;
    }

    try {
      const playlist = await suggestPlaylistForTopic(topic.title, channelIds);
      if (!playlist) {
        console.log(`- ${topic.title}: no confident match`);
        continue;
      }

      await prisma.topic.update({
        where: { id: topic.id },
        data: {
          playlistId: playlist.id,
          playlistTitle: playlist.title,
          playlistChannelTitle: playlist.channelTitle,
          playlistThumbnailUrl: playlist.thumbnailUrl,
          playlistItemCount: playlist.itemCount,
        },
      });
      attached += 1;
      console.log(`- ${topic.title}: ${playlist.title} (${playlist.itemCount} videos)`);
    } catch (error) {
      console.warn(`- ${topic.title}: failed —`, error);
    }
  }

  console.log(`Attached playlists to ${attached}/${topics.length} topics`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
