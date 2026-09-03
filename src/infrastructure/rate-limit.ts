import { NextRequest } from "next/server";

// Simple in-memory rate limiter for development
// In production, use Redis (Upstash, Vercel KV) to share rate limits across serverless functions
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  limit: number; // Max requests
  windowMs: number; // Time window in milliseconds
}

/**
 * Rate limiter that works with Next.js server components/route handlers
 * For production, replace with a distributed Redis-based solution
 */
export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  // Extract IP from x-forwarded-for header (works in Vercel/Next.js deployments)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
  const key = `${ip}:${req.nextUrl.pathname}`;
  const now = Date.now();

  const current = rateLimitMap.get(key);
  
  // If entry doesn't exist or has expired, create a new one
  if (!current || current.resetAt < now) {
    const resetAt = now + options.windowMs;
    rateLimitMap.set(key, { count: 1, resetAt });
    return { success: true, remaining: options.limit - 1, resetAt };
  }

  // If we've exceeded the limit, block the request
  if (current.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: current.resetAt };
  }

  // Otherwise, increment the count
  current.count += 1;
  rateLimitMap.set(key, current);
  return { success: true, remaining: options.limit - current.count, resetAt: current.resetAt };
}

// Preconfigured rate limits for different endpoint types
export const rateLimits = {
  // Auth endpoints (strict to prevent brute force)
  auth: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
  // Path generation (expensive API call, strict limits)
  generatePath: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 paths per hour
  // General API endpoints
  api: { limit: 300, windowMs: 60 * 60 * 1000 }, // 300 requests per hour
  // Public read endpoints (looser limits)
  public: { limit: 1000, windowMs: 60 * 60 * 1000 }, // 1000 requests per hour
};