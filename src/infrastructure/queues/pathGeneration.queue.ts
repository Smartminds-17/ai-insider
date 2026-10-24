// Path generation queue implementation - refreshed 2026-10-24T03:55:00Z
import { createLearningPath, processLearningPathTopics } from "@/application/generatePath";
import type { Syllabus } from "@/domain/types";
import { prisma } from "@/infrastructure/db/prisma";
import { Queue, Worker } from "bullmq";
import { after } from "next/server";

// BullMQ requires a native Redis connection. Upstash REST credentials are only
// suitable for HTTP clients such as @upstash/redis, not for a queue worker.
const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl?.trim()) {
    // Fallback to in-memory queue for local development (no Redis required)
    console.log("⚠️ No REDIS_URL found - using local in-memory concurrency control instead of BullMQ");
    return null;
  }

  try {
    // Parse Redis URL and format correctly for BullMQ (supports both local and Upstash)
    const parsedUrl = new URL(redisUrl);
    const isLocalRedis = parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";
    
    console.log(`✅ Using ${isLocalRedis ? "local" : "remote (Upstash)"} Redis for BullMQ queue:`, parsedUrl.hostname);
    
    // Build connection config - only use TLS for remote/Upstash Redis
    const connection: {
      host: string;
      port: number;
      username?: string;
      password?: string;
      tls?: { rejectUnauthorized: boolean };
      } = {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port || "6379"),
    };
    
    // Only add credentials and TLS if they exist in the URL (required for Upstash)
    if (parsedUrl.username) connection.username = parsedUrl.username;
    if (parsedUrl.password) connection.password = parsedUrl.password;
    if (!isLocalRedis) {
      connection.tls = {
        rejectUnauthorized: true, // Required for Upstash TLS
      };
    }
    
    return connection;
  } catch (err) {
    console.error("❌ Failed to parse Redis URL, falling back to in-memory queue:", err);
    return null;
  }
};

const redisConnection = getRedisConnection();

// Initialize queue only if we have a valid Redis connection
let pathGenerationQueue: Queue | null = null;
let pathGenerationWorker: Worker | null = null;

// Vercel functions are short-lived and must not host a BullMQ worker. On
// Vercel, work is registered with Next.js after() below; persistent hosts run
// the BullMQ worker in their long-lived Node process.
if (redisConnection && process.env.VERCEL !== "1") {
  // Create BullMQ queue for production (uses Upstash Redis) with proper DLQ configuration
  pathGenerationQueue = new Queue("path-generation", { 
    connection: redisConnection,
    // Default job settings including Dead-Letter Queue configuration
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnFail: { count: 0 }, // Keep failed jobs for debugging in DLQ
    }
  });
  
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
      },
    }
  );

  let queueUnavailableLogged = false;
  const reportQueueError = (error: Error) => {
    if (queueUnavailableLogged) return;
    queueUnavailableLogged = true;
    console.warn("Path-generation Redis is unavailable; check REDIS_URL.", error.message);
  };
  pathGenerationQueue.on("error", reportQueueError);
  pathGenerationWorker.on("error", reportQueueError);
  pathGenerationWorker.on("ready", () => {
    queueUnavailableLogged = false;
  });
}

// Helper function to add a new path generation job (uses either BullMQ or in-memory queue)
async function queuePathGeneration(userId: string, prompt: string): Promise<{ jobId: string }> {
  if (process.env.NODE_ENV === "production" && !pathGenerationQueue && process.env.VERCEL !== "1") {
    throw new Error("Path generation is unavailable: configure REDIS_URL for the production worker.");
  }

  // Reject before creating the path and goal, so throttled attempts leave no rows behind.
  if (pathGenerationQueue) {
    const userJobs = await pathGenerationQueue.getJobs(["active", "waiting"]);
    const userRecentJobs = userJobs.filter((job) => job.data.userId === userId);
    if (userRecentJobs.length >= 5) throw new Error("RATE_LIMITED");
  }

  // Fast phase runs inline for BOTH environments: one Gemini call + two DB
  // writes, so the frontend gets a real database ID right away.
  const { pathId, syllabus } = await createLearningPath(userId, prompt);

  // Vercel does not host durable BullMQ workers. Use the platform-supported
  // post-response lifetime hook so processing remains attached to the request.
  if (process.env.VERCEL === "1") {
    after(async () => {
      await processLearningPathTopics(pathId, syllabus);
    });
  } else if (pathGenerationQueue) {
    try {
      // Add job to BullMQ queue to process in background. Pass the syllabus we
      // already generated so the worker doesn't call Gemini a second time.
      // Uses default queue-level job options (DLQ, retries, backoff)
      await pathGenerationQueue.add(
        "generate-path",
        { userId, pathId, syllabus },
        {
          removeOnComplete: true, // Clean up successful jobs immediately
        }
      );
    } catch (queueErr) {
      await prisma.learningPath.update({ where: { id: pathId }, data: { status: "FAILED" } });
      throw new Error("Path generation could not be queued.", { cause: queueErr });
    }
  } else {
    // Development only; production is required to use a persistent worker.
    void processLearningPathTopics(pathId, syllabus).catch((error) => {
      console.error("Local path generation failed:", error);
    });
  }
  
  return { jobId: pathId }; // Return real DB path ID, not BullMQ job ID
}

// Helper to restart stuck GENERATING paths (for server reboots or manual retries)
async function restartStuckPath(pathId: string, userId: string): Promise<{ jobId: string }> {
  // Fetch the existing path and its syllabus from the database
  const existingPath = await prisma.learningPath.findUnique({
    where: { id: pathId, userId },
    include: { topics: true }
  });

  if (!existingPath) {
    throw new Error("Path not found");
  }

  // Reconstruct syllabus from existing topics
  const syllabus = {
    title: existingPath.title,
    topics: existingPath.topics.map(t => ({ title: t.title, order: t.order }))
  };

  // Reset status to GENERATING and restart processing
  await prisma.learningPath.update({
    where: { id: pathId },
    data: { status: "GENERATING" }
  });

  if (process.env.VERCEL === "1") {
    after(async () => {
      await processLearningPathTopics(pathId, syllabus);
    });
  } else if (pathGenerationQueue) {
    try {
      await pathGenerationQueue.add(
        "generate-path",
        { userId, pathId, syllabus },
        {
          removeOnComplete: true,
        }
      );
    } catch (queueErr) {
      await prisma.learningPath.update({ where: { id: pathId }, data: { status: "FAILED" } });
      throw new Error("Path generation could not be restarted.", { cause: queueErr });
    }
  } else {
    void processLearningPathTopics(pathId, syllabus).catch((error) => {
      console.error("Local path restart failed:", error);
    });
  }
  
  return { jobId: pathId };
}

export { getRedisConnection, pathGenerationQueue, pathGenerationWorker, queuePathGeneration, restartStuckPath };
