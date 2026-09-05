import { prisma } from "@/infrastructure/db/prisma";
import type { Syllabus } from "@/domain/types";
import { generateSyllabus } from "@/infrastructure/llm/syllabusGenerator";
import { rankVideos } from "@/infrastructure/youtube/rankVideos";
import { searchVideosForTopic } from "@/infrastructure/youtube/youtubeClient";

const VIDEOS_PER_TOPIC = 5;

/**
 * Fast phase: one Gemini call + two DB writes. Creates the Goal and
 * LearningPath rows (status GENERATING) and returns immediately so the
 * caller can hand the user a real path ID right away. Does NOT touch
 * YouTube — that's the slow phase, handled separately by
 * processLearningPathTopics() so it only ever runs once per path
 * regardless of whether a queue is involved.
 */
export async function createLearningPath(
  userId: string,
  prompt: string
): Promise<{ pathId: string; syllabus: Syllabus }> {
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

  return { pathId: path.id, syllabus };
}

/**
 * Slow phase: sources and ranks YouTube videos for every topic in the
 * syllabus, one topic at a time (to respect the free-tier rate limiter),
 * then flips the path to READY (or FAILED). Call this exactly once per
 * path — whether inline (local dev) or from a queue worker (production).
 */
export async function processLearningPathTopics(pathId: string, syllabus: Syllabus): Promise<void> {
  try {
    const processTopic = async (topic: { title: string; order: number }) => {
      const createdTopic = await prisma.topic.create({
        data: {
          learningPathId: pathId,
          title: topic.title,
          order: topic.order,
        },
      });

      const candidates = await searchVideosForTopic(topic.title, 12);
      const ranked = rankVideos(candidates, VIDEOS_PER_TOPIC);

      let firstVideoId: string | null = null;

      // Create all video records in parallel first (to avoid duplicates)
      const videos = await Promise.all(
        ranked.map((v) =>
          prisma.video.upsert({
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
          })
        )
      );

      // Process topic-video associations sequentially to maintain order
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        if (i === 0) firstVideoId = video.id;

        // Use upsert to avoid unique constraint violations if the same video is reused for multiple topics
        await prisma.topicVideo.upsert({
          where: {
            topicId_videoId: {
              topicId: createdTopic.id,
              videoId: video.id,
            },
          },
          update: {}, // If it exists, do nothing
          create: {
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

    // Process topics ONE AT A TIME (sequentially) to respect YouTube's free tier rate limits
    // Our global sequential YouTube rate limiter only allows 1 search every 16 minutes, so parallel processing
    // would just cause extremely long waits in the queue. This way each topic waits its turn properly.
    for (const topic of syllabus.topics) {
      await processTopic(topic);
    }

    await prisma.learningPath.update({
      where: { id: pathId },
      data: { status: "READY" },
    });
    console.log("Learning path generation complete:", pathId);
  } catch (err) {
    console.error("Background path generation failed:", err);
    await prisma.learningPath.update({
      where: { id: pathId },
      data: { status: "FAILED" },
    });
  }
}

/**
 * Convenience wrapper for callers that don't need the two phases split
 * apart (e.g. local dev without a queue). Runs both phases, returning the
 * pathId immediately and a processingPromise for the slow phase so the
 * caller can await it (or hand it to waitUntil()) without blocking the
 * fast phase.
 */
export async function generatePath(
  userId: string,
  prompt: string
): Promise<{ pathId: string; processingPromise: Promise<void> }> {
  const { pathId, syllabus } = await createLearningPath(userId, prompt);
  const processingPromise = processLearningPathTopics(pathId, syllabus);
  return { pathId, processingPromise };
}