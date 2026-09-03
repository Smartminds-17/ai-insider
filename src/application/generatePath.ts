import { prisma } from "@/infrastructure/db/prisma";
import { generateSyllabus } from "@/infrastructure/llm/syllabusGenerator";
import { rankVideos } from "@/infrastructure/youtube/rankVideos";
import { searchVideosForTopic } from "@/infrastructure/youtube/youtubeClient";

const VIDEOS_PER_TOPIC = 5;

export async function generatePath(userId: string, prompt: string): Promise<{ pathId: string; processingPromise: Promise<void> }> {
  const syllabus = await generateSyllabus(prompt);

  const goal = await prisma.goal.create({
    data: {
      userId,
      prompt,
      title: syllabus.title,
      status: "ACTIVE",
    },
  });

  const path = await prisma.learningPath.create({
    data: {
      goalId: goal.id,
      userId,
      prompt,
      title: syllabus.title,
      status: "GENERATING",
      outline: syllabus as object,
    },
  });

  // Create the processing promise first, return it to the API route to pass to waitUntil()
  // This guarantees Next.js keeps the request context alive until processing completes
  const processingPromise = (async () => {
    try {
      // Process all topics in parallel (max 3 at a time to avoid rate limits)
      const processTopic = async (topic: { title: string; order: number }) => {
        const createdTopic = await prisma.topic.create({
          data: {
            learningPathId: path.id,
            title: topic.title,
            order: topic.order,
          },
        });

        const candidates = await searchVideosForTopic(topic.title, 12);
        const ranked = rankVideos(candidates, VIDEOS_PER_TOPIC);

        let firstVideoId: string | null = null;

        // Process videos for this topic sequentially (to maintain order)
        for (let i = 0; i < ranked.length; i++) {
          const v = ranked[i];

          const video = await prisma.video.upsert({
            where: { youtubeVideoId: v.youtubeVideoId },
            update: {
              title: v.title,
              channelTitle: v.channelTitle,
              thumbnailUrl: v.thumbnailUrl,
              durationSec: v.durationSec,
              viewCount: v.viewCount,
              publishedAt: new Date(v.publishedAt),
            },
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

          if (i === 0) firstVideoId = video.id;

          await prisma.topicVideo.create({
            data: {
              topicId: createdTopic.id,
              videoId: video.id,
              order: i,
              source: "GENERATED",
              selected: i === 0,
            },
          });
        }

        if (firstVideoId) {
          await prisma.topic.update({
            where: { id: createdTopic.id },
            data: { selectedVideoId: firstVideoId },
          });
        }
      };

      // Process topics in controlled parallel batches (2 at a time)
      // Our global YouTube rate limiter handles quota management automatically
      // No need for manual setTimeout delays - the token bucket prevents API overloads
      const batchSize = 2; // Process 2 topics concurrently
      for (let i = 0; i < syllabus.topics.length; i += batchSize) {
        const batch = syllabus.topics.slice(i, i + batchSize);
        await Promise.all(batch.map(topic => processTopic(topic)));
      }

      await prisma.learningPath.update({
        where: { id: path.id },
        data: { status: "READY" },
      });
      console.log("Learning path generation complete:", path.id);
    } catch (err) {
      console.error("Background path generation failed:", err);
      await prisma.learningPath.update({
        where: { id: path.id },
        data: { status: "FAILED" },
      });
    }
  })();

  // Return immediately to the client, pass the promise to waitUntil() in API route
  return { pathId: path.id, processingPromise };
}