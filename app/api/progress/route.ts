import { setVideoWatched, updatePlaybackPosition } from "@/application/trackProgress";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { prisma } from "@/infrastructure/db/prisma";
import { rateLimit, rateLimits } from "@/infrastructure/rate-limit";
import { NextRequest, NextResponse } from "next/server";

// Simple structured logger for progress events
const logProgressEvent = (event: string, data: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: "video-progress",
    event,
    ...data
  }));
};

export async function POST(req: NextRequest) {
  // Apply rate limiting - 300 requests/hour matches general API limits, which is more than enough for 5s updates
  const { success, remaining } = await rateLimit(req, rateLimits.api);
  if (!success) {
    logProgressEvent("rate_limited", { path: req.nextUrl.pathname });
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const videoId = typeof body?.videoId === "string" ? body.videoId : null;
  const watched = typeof body?.watched === "boolean" ? body.watched : null;
  const positionSec = typeof body?.positionSec === "number" ? body.positionSec : null;

  const userId = await getOrCreateUserId();

  // Handle playback position update (most frequent call from video player)
  if (videoId && positionSec !== null) {
    try {
      await updatePlaybackPosition(userId, videoId, positionSec);
      logProgressEvent("position_updated", { userId, videoId, positionSec, remainingRequests: remaining });
      return NextResponse.json({ data: { videoId, positionSec }, meta: {}, error: null });
    } catch (err) {
      logProgressEvent("position_update_failed", { userId, videoId, error: err });
      return NextResponse.json(
        { data: null, meta: {}, error: { code: "UPDATE_FAILED", message: "Failed to save playback position" } },
        { status: 500 }
      );
    }
  }

  // Handle full watched toggle (when user marks video as complete)
  if (!videoId || watched === null) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "INVALID_INPUT", message: "videoId + (watched or positionSec) are required" } },
      { status: 400 }
    );
  }

  await setVideoWatched(userId, videoId, watched);
  return NextResponse.json({ data: { videoId, watched }, meta: {}, error: null });
}

// GET endpoint to fetch current playback progress for a video
export async function GET(req: NextRequest) {
  // Apply rate limiting - 300 requests/hour matches general API limits
  const { success, remaining } = await rateLimit(req, rateLimits.api);
  if (!success) {
    logProgressEvent("rate_limited", { path: req.nextUrl.pathname, method: "GET" });
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");
  if (!videoId) {
    logProgressEvent("missing_video_id", { path: req.nextUrl.pathname, method: "GET" });
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "MISSING_VIDEO_ID", message: "videoId query param is required" } },
      { status: 400 }
    );
  }

  const userId = await getOrCreateUserId();
  try {
    const progress = await prisma.progress.findUnique({
      where: { userId_videoId: { userId, videoId } },
      select: { positionSec: true, watched: true, lastWatchedAt: true }
    });

    logProgressEvent("progress_fetched", { userId, videoId, positionSec: progress?.positionSec || 0, remainingRequests: remaining });
    return NextResponse.json({ 
      data: progress || { positionSec: 0, watched: false, lastWatchedAt: null }, 
      meta: {}, 
      error: null 
    });
  } catch (err) {
    logProgressEvent("progress_fetch_failed", { userId, videoId, error: err });
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "FETCH_FAILED", message: "Failed to load playback progress" } },
      { status: 500 }
    );
  }
}