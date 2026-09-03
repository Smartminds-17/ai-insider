import { getUserPaths } from "@/application/getUserPaths";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { queuePathGeneration } from "@/infrastructure/queues/pathGeneration.queue";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const MAX_PROMPT_LENGTH = 300;
// Rate limiting: 5 path generations per user per hour
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 3600; // 1 hour in seconds (for Redis)
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds (for in-memory)

// Initialize Upstash Redis only if credentials are valid
const getRedis = () => {
  const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!upstashRestUrl?.trim() || !upstashToken?.trim()) {
    return null;
  }
  
  return new Redis({
    url: upstashRestUrl,
    token: upstashToken,
  });
};

const redis = getRedis();

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
    
    // 1. Apply rate limiting (Redis-based if available, otherwise skip - queue already has in-memory limits)
    if (redis) {
      // Redis-based distributed rate limiting for production
      const userRateKey = `rate_limit:${userId}`;
      const currentCount = await redis.incr(userRateKey);
      
      // Set expiration if this is the first request in the window
      if (currentCount === 1) {
        await redis.expire(userRateKey, RATE_WINDOW_SECONDS);
      }
      
      if (currentCount > RATE_LIMIT) {
        return NextResponse.json(
          { 
            data: null, 
            meta: {}, 
            error: { 
              code: "RATE_LIMITED", 
              message: "You've created too many paths recently. Please try again in an hour." 
            } 
          },
          { status: 429 }
        );
      }
    }

    // 2. Check for duplicate active paths with the EXACT same prompt to avoid duplicates
    // If the user already created a path with this prompt that's still GENERATING, return that path ID instead of creating a new one
    const existingPaths = await getUserPaths(userId);
    const duplicateActivePath = existingPaths.find(p => 
      p.prompt.trim() === prompt && p.status === "GENERATING"
    );
    
    if (duplicateActivePath) {
      console.log(`Found duplicate active path for prompt: ${prompt}, returning existing ID: ${duplicateActivePath.id}`);
      return NextResponse.json({ data: { id: duplicateActivePath.id }, meta: {}, error: null }, { status: 202 });
    }

    // 3. Use production-grade queue to handle path generation
     const { jobId } = await queuePathGeneration(userId, prompt);
     
     // Return immediately to the user with their job ID
     // The frontend will poll for updates on this path
     return NextResponse.json({ data: { id: jobId }, meta: {}, error: null }, { status: 202 });
  } catch (err) {
    console.error("generatePath failed", err);
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "GENERATION_FAILED", message: "Could not generate path" } },
      { status: 500 }
    );
  }
}