import { pathGenerationWorker } from "@/infrastructure/queues/pathGeneration.queue";
import type { Job } from "bullmq";
import { NextRequest, NextResponse } from "next/server";

// Initialize queue worker - call this once on app startup or via a cron job
export async function GET(req: NextRequest) {
  // Only allow internal calls to this endpoint
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get secret from request URL query parameter
  const { searchParams } = new URL(req.url);
  const requestSecret = searchParams.get("secret");
  
  if (requestSecret !== internalSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only set up worker event listeners if we're using BullMQ (production)
  if (pathGenerationWorker) {
    pathGenerationWorker.on("completed", (job: Job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    pathGenerationWorker.on("failed", (job: Job | undefined, error: Error) => {
      console.error(`Job ${job?.id} failed:`, error);
    });

    return NextResponse.json({ 
      status: "Queue worker running",
      activeWorkers: 1,
      concurrency: 2
    });
  } else {
    // In local development mode with in-memory queue
    return NextResponse.json({ 
      status: "In-memory concurrency control active (local development)",
      activeWorkers: 0,
      concurrency: 2,
      note: "Set up Upstash Redis for production queueing"
    });
  }
}