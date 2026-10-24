
import { authOptions } from "@/infrastructure/auth/auth";
import { rateLimit, rateLimits } from "@/infrastructure/rate-limit";
import NextAuth from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

// Create the base NextAuth handler first
const handler = NextAuth(authOptions);

// Wrap with rate limiting for App Router pattern
export async function GET(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  // Apply strict rate limiting to auth endpoints to prevent brute force attacks
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

  return handler(req, { params });
}

export async function POST(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  // Apply same rate limiting to POST requests
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

  return handler(req, { params });
}