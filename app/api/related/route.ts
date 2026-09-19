import { NextRequest, NextResponse } from "next/server";
import { getRelatedVideos } from "@/application/getRelatedVideos";
import { rateLimit, rateLimits } from "@/infrastructure/rate-limit";

export async function GET(req: NextRequest) {
  const { success } = await rateLimit(req, rateLimits.public);
  if (!success) {
    return NextResponse.json({ data: null, meta: {}, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } }, { status: 429 });
  }
  const field = req.nextUrl.searchParams.get("field");
  if (!field || field.trim().length > 120) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "INVALID_INPUT", message: "field query param is required" } },
      { status: 400 }
    );
  }

  const videos = await getRelatedVideos(field);
  return NextResponse.json({ data: videos, meta: {}, error: null });
}
