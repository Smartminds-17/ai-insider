import { NextRequest, NextResponse } from "next/server";
import { getRelatedVideos } from "@/application/getRelatedVideos";

export async function GET(req: NextRequest) {
  const field = req.nextUrl.searchParams.get("field");
  if (!field) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "INVALID_INPUT", message: "field query param is required" } },
      { status: 400 }
    );
  }

  const videos = await getRelatedVideos(field);
  return NextResponse.json({ data: videos, meta: {}, error: null });
}
