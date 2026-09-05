import { createLearningPath, processLearningPathTopics } from "@/application/generatePath";
import type { Syllabus } from "@/domain/types";
import { Queue, Worker } from "bullmq";

// Create Upstash Redis connection for BullMQ (uses REDIS_URL format: redis://:<password>@<host>:port)
const getRedisConnection = () => {
  const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!upstashRestUrl?.trim() || !upstashToken?.trim()) {
    // Fallback to in-memory queue for local development (no Redis required)
    console.log("⚠️ No Upstash credentials found - using local in-memory concurrency control instead of BullMQ");
    return null;
  }

  try {
    // Upstash REST URL = https://<username>:<password>@<host>.upstash.io
    // We need to extract host and password for native Redis connection
    const url = new URL(upstashRestUrl);
    // For Upstash Redis, the native password is the UPSTASH_REDIS_REST_TOKEN, NOT the password from the REST URL
    const host = url.hostname;
    
    // Return connection config that works with Upstash Redis (proper authentication)
    return {
      host,
      port: 6379,
      username: "default", // Upstash always uses "default" as the username
      password: upstashToken, // Use the actual REST token as the Redis password
      tls: {}, // Upstash requires TLS encryption
    };
  } catch (err) {
    console.error("❌ Failed to parse Upstash Redis URL, falling back to in-memory queue:", err);
    return null;
  }
};

const redisConnection = getRedisConnection();

// We only keep userJobTimestamps for rate limit tracking (used by debug clear endpoint)
const userJobTimestamps = new Map<string, number[]>();

// We no longer use the in-memory queue processing logic since we create
// paths immediately and process them right away - this simplifies the codebase
// and eliminates the old queueing overhead that was causing delays

// Initialize queue only if we have a valid Redis connection
let pathGenerationQueue: Queue | null = null;
let pathGenerationWorker: Worker | null = null;

// Export them for use in API routes
export { pathGenerationQueue, pathGenerationWorker, userJobTimestamps };

if (redisConnection) {
  // Create BullMQ queue for production (uses Upstash Redis)
  pathGenerationQueue = new Queue("path-generation", { connection: redisConnection });
  
  // Create worker to process jobs. The fast phase (LLM call + Goal/LearningPath
  // rows) has already run in queuePathGeneration() by the time a job reaches
  // here — the worker only ever runs the slow phase (YouTube sourcing), and
  // only once, using the syllabus we already generated rather than
  // regenerating it.
  pathGenerationWorker = new Worker(
    "path-generation",
    async (job) => {
      const { pathId, syllabus } = job.data as { pathId: string; syllabus: Syllabus };
      await processLearningPathTopics(pathId, syllabus);
      return { success: true };
    },
    { 
      connection: redisConnection,
      concurrency: 2, // Only process 2 path generations at a time
      limiter: {
        max: 5, // Max 5 jobs processed per 1 minute window across all workers
        duration: 60000,
      }
    }
  );
}

// Helper function to add a new path generation job (uses either BullMQ or in-memory queue)
export async function queuePathGeneration(userId: string, prompt: string): Promise<{ jobId: string }> {
  // Fast phase runs inline for BOTH environments: one Gemini call + two DB
  // writes, so the frontend gets a real database ID right away.
  const { pathId, syllabus } = await createLearningPath(userId, prompt);

  // Case 1: Production with BullMQ + Upstash Redis — hand the slow phase
  // (YouTube sourcing) to the worker so it runs exactly once, out of the
  // request path.
  if (pathGenerationQueue) {
    // Check rate limit for this user before adding to queue
    const userJobs = await pathGenerationQueue.getJobs(["active", "waiting"]);
    const userRecentJobs = userJobs.filter(job => job.data.userId === userId);

    if (userRecentJobs.length >= 5) {
      throw new Error("RATE_LIMITED");
    }

    // Add job to BullMQ queue to process in background. Pass the syllabus we
    // already generated so the worker doesn't call Gemini a second time.
    await pathGenerationQueue.add(
      "generate-path",
      { userId, pathId, syllabus },
      {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: "exponential",
          delay: 1000, // Start with 1s delay, double each retry
        },
        removeOnComplete: true, // Clean up successful jobs
        removeOnFail: 100, // Keep last 100 failed jobs for debugging
      }
    );

    return { jobId: pathId }; // Return real DB path ID, not BullMQ job ID
  }

  // Case 2: Local development — no Redis configured, so run the slow phase
  // inline in the background (fire-and-forget; the path is already READY-
  // pending in the DB and the frontend polls for status).
  void processLearningPathTopics(pathId, syllabus);
  return { jobId: pathId };
}