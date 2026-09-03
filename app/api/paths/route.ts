import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { generatePath } from "@/application/generatePath";
import { getUserPaths } from "@/application/getUserPaths";

const MAX_PROMPT_LENGTH = 300;

export async function GET() {
  const userId = await getOrCreateUserId();
  const paths = await getUserPaths(userId);
  return NextResponse.json({ data: paths, meta: {}, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "INVALID_INPUT", message: "prompt is required" } },
      { status: 400 }
    );
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      {
        data: null,
        meta: {},
        error: { code: "INVALID_INPUT", message: `prompt must be under ${MAX_PROMPT_LENGTH} characters` },
      },
      { status: 400 }
    );
  }

  try {
    const userId = await getOrCreateUserId();
    const pathId = await generatePath(userId, prompt);
    return NextResponse.json({ data: { id: pathId }, meta: {}, error: null }, { status: 201 });
  } catch (err) {
    console.error("generatePath failed", err);
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "GENERATION_FAILED", message: "Could not generate path" } },
      { status: 500 }
    );
  }
}
