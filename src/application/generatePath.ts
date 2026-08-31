import { prisma } from "@/infrastructure/db/prisma";
import { generateSyllabus } from "@/infrastructure/llm/syllabusGenerator";
import { searchVideosForTopic } from "@/infrastructure/youtube/youtubeClient";
import { rankVideos } from "@/infrastructure/youtube/rankVideos";

// Service layer: coordinates the LLM, YouTube client, ranking, and DB writes
// for the single use-case of "turn a prompt into a saved, ready path."
// API routes call this — they don't talk to Prisma/YouTube/LLM directly.

export async function generatePath(userId: string, prompt: string): Promise<string> {
  const syllabus = await generateSyllabus(prompt);

  const path = await prisma.learningPath.create({
    data: {
      userId,
      prompt,
      title: syllabus.title,
      status: "GENERATING",
    },
  });

  try {
    for (const topic of syllabus.topics) {
      const createdTopic = await prisma.topic.create({
        data: {
          learningPathId: path.id,
          title: topic.title,
          order: topic.order,
        },
      });

      const candidates = await searchVideosForTopic(topic.title);
      const ranked = rankVideos(candidates, 2);

      for (let i = 0; i < ranked.length; i++) {
        const v = ranked[i];

        // Cache the video (upsert — the same video may already be cached
        // from another topic/path's search).
        const video = await prisma.video.upsert({
          where: { youtubeVideoId: v.youtubeVideoId },
          update: {},
          create: {
            youtubeVideoId: v.youtubeVideoId,
            title: v.title,
            channelTitle: v.channelTitle,
            thumbnailUrl: v.thumbnailUrl,
            durationSec: v.durationSec,
            viewCount: v.viewCount,
            publishedAt: new Date(v.publishedAt),
          },
        });

        await prisma.topicVideo.create({
          data: { topicId: createdTopic.id, videoId: video.id, order: i },
        });
      }
    }

    await prisma.learningPath.update({
      where: { id: path.id },
      data: { status: "READY" },
    });
  } catch (err) {
    await prisma.learningPath.update({
      where: { id: path.id },
      data: { status: "FAILED" },
    });
    throw err;
  }

  return path.id;
}
