import { generatePath } from "@/application/generatePath";
import { getCurrentUserId } from "@/infrastructure/auth/authorization";
import { rateLimit, rateLimits } from "@/infrastructure/rate-limit";
import { NextRequest, NextResponse, after } from "next/server";

const MAX_PROMPT_LENGTH = 300;

export async function POST(req: NextRequest) {
  // Apply rate limiting first to block abuse early - critical for concurrent users
  const rateLimitResult = await rateLimit(req, rateLimits.generatePath);
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { 
        status: 429,
        headers: { "Retry-After": retryAfter.toString() }
      }
    );
  }

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
    // Get validated current user ID - ensures only authorized users can generate paths
    const userId = await getCurrentUserId();
    const { pathId, processingPromise } = await generatePath(userId, prompt);
    // Tell Next.js to keep the request context alive until background processing finishes
    after(processingPromise);
    return NextResponse.json(
      { data: { id: pathId }, meta: { rateLimitRemaining: rateLimitResult.remaining }, error: null },
      { status: 201 }
    );
  } catch (err) {
    console.error("generatePath failed", err);
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "GENERATION_FAILED", message: "Could not generate path" } },
      { status: 500 }
    );
  }
}