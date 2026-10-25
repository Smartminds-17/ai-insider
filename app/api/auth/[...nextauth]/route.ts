
import { authOptions } from "@/infrastructure/auth/auth";
import { rateLimit, rateLimits } from "@/infrastructure/rate-limit";
import NextAuth from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

// Create the base NextAuth handler first
const handler = NextAuth(authOptions);

// Next.js 16.3.3 requires dynamic route params to be a Promise that must be awaited
// This fixes the "params is a Promise" runtime error
export async function GET(req: NextRequest, incoming: { params: Promise<{ nextauth: string[] }> }) {
  // EXPLICIT await to ensure Next.js's static analysis detects we're unwrapping the Promise
  const resolvedParams = await incoming.params;
  // Only apply strict rate limiting to actual login attempts, not session checks
  const isSessionRequest = resolvedParams.nextauth.includes("session");
  
  if (!isSessionRequest) {
    const { success, remaining, resetAt } = await rateLimit(req, rateLimits.auth);
    
    if (!success) {
      // Extract IP properly from headers since req.ip doesn't exist on NextRequest in all environments
      const forwardedFor = req.headers.get("x-forwarded-for");
      const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
      console.warn(`Auth rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimits.auth.limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetAt.toString(),
          }
        }
      );
    }
  }

  // Pass resolved params to NextAuth handler which expects the unwrapped object
  return handler(req, { params: resolvedParams });
}

export async function POST(req: NextRequest, incoming: { params: Promise<{ nextauth: string[] }> }) {
  // EXPLICIT await to ensure Next.js's static analysis detects we're unwrapping the Promise
  const resolvedParams = await incoming.params;
  // Only apply strict rate limiting to credential-based login attempts
  const isLoginAttempt = resolvedParams.nextauth.includes("credentials") || resolvedParams.nextauth.includes("login");
  
  if (isLoginAttempt) {
    const { success, remaining, resetAt } = await rateLimit(req, rateLimits.auth);
    
    if (!success) {
      const forwardedFor = req.headers.get("x-forwarded-for");
      const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
      console.warn(`Auth rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimits.auth.limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': resetAt.toString(),
          }
        }
      );
    }
  }

  // Pass resolved params to NextAuth handler which expects the unwrapped object
  return handler(req, { params: resolvedParams });
}