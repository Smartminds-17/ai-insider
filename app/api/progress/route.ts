import { setVideoWatched, updatePlaybackPosition } from "@/application/trackProgress";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { prisma } from "@/infrastructure/db/prisma";
import { rateLimit, rateLimits } from "@/infrastructure/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const videoId = typeof body?.videoId === "string" ? body.videoId : null;

  if (!videoId) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "INVALID_INPUT", message: "videoId is required" } },
      { status: 400 }
    );
  }

  const userId = await getOrCreateUserId();

  // Manual "mark as watched" checkbox toggle (unchanged behavior).
  if (typeof body?.watched === "boolean") {
    await setVideoWatched(userId, videoId, body.watched);
    return NextResponse.json({ data: { videoId, watched: body.watched }, meta: {}, error: null });
  }

  // Streaming update sent periodically by the player while a video plays.
  const deltaSeconds = typeof body?.deltaSeconds === "number" ? body.deltaSeconds : null;
  const positionSec = typeof body?.positionSec === "number" ? body.positionSec : null;
  const durationSec = typeof body?.durationSec === "number" ? body.durationSec : undefined;

  if (deltaSeconds === null || positionSec === null) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: { code: "INVALID_INPUT", message: "Provide either watched, or deltaSeconds + positionSec" },
      },
      { status: 400 }
    );
  }

  const result = await updatePlaybackPosition(userId, videoId, positionSec);

  return NextResponse.json({ data: { videoId, lastPositionSec: positionSec }, meta: {}, error: null });
}

// GET endpoint to fetch current playback progress for a video
export async function GET(req: NextRequest) {
  // Apply rate limiting - 300 requests/hour matches general API limits
  const { success, remaining } = await rateLimit(req, rateLimits.api);
  if (!success) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId");
  if (!videoId) {
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

    return NextResponse.json({ 
      data: progress || { positionSec: 0, watched: false, lastWatchedAt: null }, 
      meta: {}, 
      error: null 
    });
  } catch (err) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "FETCH_FAILED", message: "Failed to load playback progress" } },
      { status: 500 }
    );
  }
}