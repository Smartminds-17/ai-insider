import {
  ensurePathGenerationQueue,
  getPathGenerationWorker,
} from "@/infrastructure/queues/pathGeneration.queue";
import type { Job } from "bullmq";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

// Initialize queue worker - call this once on app startup or via a cron job
export async function GET(req: NextRequest) {
  // Only allow internal calls to this endpoint
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = Buffer.from(internalSecret);
  const received = Buffer.from(requestSecret);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Initialize the queue lazily (it probes Redis first), then attach listeners
  // once. Repeated calls must not register duplicate listeners.
  await ensurePathGenerationQueue();
  const queueWorker = getPathGenerationWorker();

  // Only set up worker event listeners if we're using BullMQ (production)
  if (queueWorker) {
    if (queueWorker.listenerCount("completed") === 0) {
      queueWorker.on("completed", (job: Job) => {
        console.log(`Job ${job.id} completed successfully`);
      });

      queueWorker.on("failed", (job: Job | undefined, error: Error) => {
        console.error(`Job ${job?.id} failed:`, error);
      });
    }

    return NextResponse.json({ 
      status: "Queue worker running",
      activeWorkers: 1,
      concurrency: 2
    });
  } else if (process.env.VERCEL === "1") {
    return NextResponse.json({
      status: "Vercel post-response processing enabled",
      note: "Path generation runs through Next.js after() and is bounded by the route maxDuration.",
    });
  } else {
    // In local development mode without a native Redis worker
    return NextResponse.json({ 
      status: "In-memory concurrency control active (local development)",
      activeWorkers: 0,
      concurrency: 2,
      note: "Set up Upstash Redis for production queueing"
    });
  }
}
