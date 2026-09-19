import { getUserPaths } from "@/application/getUserPaths";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { prisma } from "@/infrastructure/db/prisma";
import { queuePathGeneration } from "@/infrastructure/queues/pathGeneration.queue";
import { rateLimit, rateLimits } from "@/infrastructure/rate-limit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const MAX_PROMPT_LENGTH = 300;
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 3600;

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

// Free tier limit: 3 routes per month
const FREE_TIER_MONTHLY_LIMIT = 3;

export async function GET() {
  try {
    const userId = await getOrCreateUserId();
    const paths = await getUserPaths(userId);
    
    // Calculate current month's usage for the current user
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPaths = paths.filter(path => new Date(path.createdAt) >= firstDayOfMonth);
    const monthlyUsage = monthlyPaths.length;
    
    // Calculate TOTAL platform-wide paths created this month (resets every month)
    const totalMonthlyPaths = await prisma.learningPath.count({
      where: {
        createdAt: {
          gte: firstDayOfMonth
        }
      }
    });
    
    // Calculate LIFETIME total paths created since product launch (never resets - for landing page)
    const lifetimeTotalPaths = await prisma.learningPath.count({});
    
    return NextResponse.json({ 
      data: paths, 
      meta: { 
        monthlyUsage,
        monthlyLimit: FREE_TIER_MONTHLY_LIMIT,
        totalMonthlyPaths,
        lifetimeTotalPaths
      }, 
      error: null 
    });
  } catch (error) {
    console.error("⚠️ GET /api/paths failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      code: (error as { code?: string })?.code
    });
    return NextResponse.json(
      { 
        data: [], 
        meta: { monthlyUsage: 0, monthlyLimit: 3, totalMonthlyPaths: 0, lifetimeTotalPaths: 0 }, 
        error: { 
          code: "INTERNAL_ERROR", 
          message: "Failed to load your learning paths. Please refresh and try again." 
        } 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const localLimit = await rateLimit(req, rateLimits.generatePath);
  if (!localLimit.success) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RATE_LIMITED", message: "You've created too many paths recently. Please try again in an hour." } },
      { status: 429 }
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

    // 2. Check for ANY duplicate paths (both GENERATING and READY) with the EXACT same prompt to avoid duplicates
    // This prevents double-clicks or resubmissions from creating multiple identical paths
    const existingPaths = await getUserPaths(userId);
    const duplicatePath = existingPaths.find(p => 
      p.prompt.trim() === prompt && (p.status === "GENERATING" || p.status === "READY")
    );
    
    if (duplicatePath) {
      console.log(`Found existing path for prompt: ${prompt}, returning existing ID: ${duplicatePath.id}`);
      return NextResponse.json({ data: { id: duplicatePath.id }, meta: {}, error: null }, { status: 202 });
    }

    // 3. Check free tier monthly limit before creating new path
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPaths = existingPaths.filter(path => new Date(path.createdAt) >= firstDayOfMonth);
    const monthlyUsage = monthlyPaths.length;

    if (monthlyUsage >= FREE_TIER_MONTHLY_LIMIT) {
      return NextResponse.json(
        { 
          data: null, 
          meta: { monthlyUsage, monthlyLimit: FREE_TIER_MONTHLY_LIMIT }, 
          error: { 
            code: "LIMIT_REACHED", 
            message: "You've used all 3 of your free paths this month. Upgrade to create more!" 
          } 
        },
        { status: 402 } // Payment Required status code
      );
    }

    // 4. Use production-grade queue to handle path generation
     const { jobId } = await queuePathGeneration(userId, prompt);
     
     // Return immediately to the user with their job ID
     // The frontend will poll for updates on this path
     return NextResponse.json({ data: { id: jobId }, meta: { monthlyUsage: monthlyUsage + 1, monthlyLimit: FREE_TIER_MONTHLY_LIMIT }, error: null }, { status: 202 });
  } catch (err) {
    console.error("generatePath failed", err);
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "GENERATION_FAILED", message: "Could not generate path" } },
      { status: 500 }
    );
  }
}