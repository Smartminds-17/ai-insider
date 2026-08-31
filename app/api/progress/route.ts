import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { setVideoWatched } from "@/application/trackProgress";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const videoId = typeof body?.videoId === "string" ? body.videoId : null;
  const watched = typeof body?.watched === "boolean" ? body.watched : null;

  if (!videoId || watched === null) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "INVALID_INPUT", message: "videoId and watched are required" } },
      { status: 400 }
    );
  }

  const userId = await getOrCreateUserId();
  await setVideoWatched(userId, videoId, watched);

  return NextResponse.json({ data: { videoId, watched }, meta: {}, error: null });
}
