import { getSystemConfig, seedSystemConfig } from "@/src/application/getSystemConfig";
import { NextResponse } from "next/server";

export async function GET() {
  // Seed configs first to ensure they exist
  await seedSystemConfig();
  
  // Fetch only client-safe config values (never expose secrets)
  const [
    pathGenerationPollInterval,
    pathGeneratingMessage,
    pathFailedMessage,
    progressAutoSaveInterval
  ] = await Promise.all([
    getSystemConfig<number>("path_generation_poll_interval_ms"),
    getSystemConfig<string>("path_generating_message"),
    getSystemConfig<string>("path_failed_message"),
    getSystemConfig<number>("progress_auto_save_interval_ms")
  ]);

  return NextResponse.json({
    data: {
      pathGenerationPollIntervalMs: pathGenerationPollInterval ?? 2000,
      pathGeneratingMessage: pathGeneratingMessage ?? "Finding the best videos for each stop — this takes a moment.",
      pathFailedMessage: pathFailedMessage ?? "Something went wrong charting this route. Try creating a new one.",
      progressAutoSaveIntervalMs: progressAutoSaveInterval ?? 5000
    }
  });
}