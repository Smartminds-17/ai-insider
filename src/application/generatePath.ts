import { assignLearningCommunity } from "@/application/learningCommunity";
import type { Syllabus } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";
import { generateSyllabus } from "@/infrastructure/llm/syllabusGenerator";
import { queuePathGeneration } from "@/infrastructure/queues/pathGeneration.queue";
import { rankVideos } from "@/infrastructure/youtube/rankVideos";
import { getPlaylistVideos, searchVideosForTopic, fetchChannelDetails } from "@/infrastructure/youtube/youtubeClient";
import { Video } from "@prisma/client";

// Upper bound only: rankVideos() keeps a variable number of videos per topic
// (1..5) based on score coverage and quality cliffs, plus near-duplicate title
// collapsing, so well-covered topics aren't padded to a fixed count.
const MIN_VIDEOS_PER_TOPIC = 2; // used only to size the search request
const MAX_VIDEOS_PER_TOPIC = 5;

/**
 * Fast phase: generate the syllabus, create the Goal and LearningPath, and
 * create or reuse the learner's topic community in one database transaction.
 * YouTube sourcing remains in processLearningPathTopics().
 */
export async function createLearningPath(
  userId: string,
  prompt: string
): Promise<{ pathId: string; syllabus: Syllabus }> {
  const syllabus = await generateSyllabus(prompt);

  return prisma.$transaction(async (tx) => {
    const goal = await tx.goal.create({
      data: {
        userId,
        prompt,
        title: syllabus.title,
        status: "ACTIVE",
      },
    });

    const path = await tx.learningPath.create({
      data: {
        goalId: goal.id,
        userId,
        prompt,
        title: syllabus.title,
        status: "GENERATING",
        outline: syllabus as object,
      },
    });

    await assignLearningCommunity(tx, userId, prompt);

    return { pathId: path.id, syllabus };
  });
}

// Guards against the same path being processed twice in one process (e.g. a
// queue job that was actually delivered after its add() timed out, while the
// request had already fallen back to inline processing).
const inFlightPaths = new Set<string>();

/**
 * Slow phase: sources and ranks YouTube videos for every topic in the
 * syllabus, one topic at a time (to respect the free-tier rate limiter),
 * then flips the path to READY (or FAILED). Call this exactly once per
 * path — whether inline (local dev) or from a queue worker (production).
 */
export async function processLearningPathTopics(pathId: string, syllabus: Syllabus, playlistId?: string): Promise<void> {
  if (inFlightPaths.has(pathId)) {
    console.log("Path generation already in progress; skipping duplicate run for", pathId);
    return;
  }
  inFlightPaths.add(pathId);

  try {
    const existingPath = await prisma.learningPath.findUnique({
      where: { id: pathId },
      select: { status: true },
    });
    if (!existingPath || existingPath.status === "READY") return;

    const processTopic = async (topic: { title: string; order: number }) => {
      try {
        const createdTopic = await prisma.topic.upsert({
          where: { learningPathId_order: { learningPathId: pathId, order: topic.order } },
          update: { title: topic.title },
          create: {
            learningPathId: pathId,
            title: topic.title,
            order: topic.order,
          },
        });

        // If a playlist is provided, fetch its videos first and prioritize them (Embed your own YouTube playlist Beta)
        let playlistCandidates: Awaited<ReturnType<typeof searchVideosForTopic>> = [];
        if (playlistId) {
          try {
            const apiKey = process.env.YOUTUBE_API_KEY;
            if (!apiKey) {
              throw new Error("YouTube sourcing is unavailable: YOUTUBE_API_KEY is not configured.");
            }
            playlistCandidates = await getPlaylistVideos(playlistId, apiKey);
            console.log(`[YouTube Playlist Beta] Fetched ${playlistCandidates.length} videos from user-provided playlist ${playlistId} for topic: ${topic.title}`);
          } catch (err) {
            console.warn(`[YouTube Playlist Beta] Failed to fetch videos from playlist ${playlistId}, falling back to search:`, err);
          }
        }
        
        // Calculate how many search results we need to complement playlist videos
        // Use our new dynamic limits: max 5 videos per topic, minimum 2
        const neededFromSearch = Math.max(0, MIN_VIDEOS_PER_TOPIC - playlistCandidates.length);
        const searchCandidates = await searchVideosForTopic(topic.title, Math.max(12, neededFromSearch * 3)); // Fetch extra search results to rank well
        
        // Combine playlist videos (prioritized) with search results
        const combinedCandidates = [...playlistCandidates, ...searchCandidates];
        const ranked = rankVideos(combinedCandidates, MAX_VIDEOS_PER_TOPIC, topic.title);
        if (ranked.length === 0) {
          throw new Error(`No suitable YouTube videos were found for topic: ${topic.title}`);
        }

        let firstVideoId: string | null = null;

        // Create all video records in parallel first (to avoid duplicates)
        const videos = await Promise.all(
          ranked.map(async (v) => {
            try {
              return await prisma.video.upsert({
                where: { youtubeVideoId: v.youtubeVideoId },
                update: {
                  title: v.title,
                  channelTitle: v.channelTitle,
                  channelId: v.channelId ?? undefined,
                  thumbnailUrl: v.thumbnailUrl,
                  durationSec: v.durationSec,
                  viewCount: v.viewCount,
                  publishedAt: new Date(v.publishedAt),
                },
                create: {
                  youtubeVideoId: v.youtubeVideoId,
                  title: v.title,
                  channelTitle: v.channelTitle,
                  channelId: v.channelId ?? null,
                  thumbnailUrl: v.thumbnailUrl,
                  durationSec: v.durationSec,
                  viewCount: v.viewCount,
                  publishedAt: new Date(v.publishedAt),
                },
              });
            } catch (error) {
              console.error(`Failed to upsert video ${v.youtubeVideoId}:`, error);
              return null;
            }
          })
        );

        const validVideos = videos.filter((v) => v !== null) as Video[];

        // Resolve handles/avatars for the creators behind these lessons. One
        // batched channels.list call per topic (1 quota unit), then stamp the
        // metadata onto every video from that channel.
        const channelIds = [
          ...new Set(
            validVideos
              .map((video) => video.channelId)
              .filter((id): id is string => Boolean(id))
          ),
        ];
        if (channelIds.length > 0) {
          const channels = await fetchChannelDetails(channelIds);
          await Promise.all(
            channels.map((channel) =>
              prisma.video
                .updateMany({
                  where: { channelId: channel.channelId },
                  data: {
                    channelHandle: channel.handle,
                    channelAvatarUrl: channel.avatarUrl,
                  },
                })
                .catch((error) => {
                  console.warn(`Failed to attach channel metadata for ${channel.channelId}:`, error);
                })
            )
          );
        }

        // Process topic-video associations sequentially to maintain order
        for (let i = 0; i < validVideos.length; i++) {
          const video = validVideos[i];
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
      } catch (error) {
        console.error(`Failed to process topic "${topic.title}":`, error);
        // Re-throw the error to be caught by the main try...catch block
        throw error;
      }
    };

    // Process topics ONE AT A TIME (sequentially) to respect YouTube's free tier rate limits
    // Our global sequential YouTube rate limiter only allows 1 search every 1 second, so parallel processing
    // would overwhelm the API. This way each topic waits its turn properly.
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
    throw err;
  } finally {
    inFlightPaths.delete(pathId);
  }
}

/**
 * Convenience wrapper for callers that don't need the two phases split
 * apart (e.g. local dev without a queue). Runs the fast phase, then
 * publishes the slow phase to the unified BullMQ queue (or inline locally).
 */
export async function generatePath(userId: string, prompt: string): Promise<{ pathId: string }> {
  const { jobId } = await queuePathGeneration(userId, prompt);
  return { pathId: jobId };
}