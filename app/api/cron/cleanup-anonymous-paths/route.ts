import { ANONYMOUS_IDENTITY_TTL_SECONDS } from "@/infrastructure/auth/getOrCreateUserId";
import { prisma } from "@/src/infrastructure/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

function isInternalRequest(req: NextRequest, secret: string) {
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = Buffer.from(secret);
  const received = Buffer.from(provided);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// Cleanup job: Delete anonymous users and paths after their 30-day identity expires.
// Callable via Supabase Cron: POST /api/cron/cleanup-anonymous-paths?secret=YOUR_INTERNAL_API_SECRET
export async function POST(req: NextRequest) {
  // Verify internal request
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "Internal API not configured" }, { status: 500 });
  }

  if (!isInternalRequest(req, internalSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Find all anonymous users (no email)
    const anonymousUsers = await prisma.user.findMany({
      where: { email: null },
      select: { id: true },
    });
    const anonymousUserIds = anonymousUsers.map(u => u.id);

    // 2. Delete paths older than the anonymous identity lifetime.
    const identityExpiry = new Date(Date.now() - ANONYMOUS_IDENTITY_TTL_SECONDS * 1000);
    const deletedPaths = await prisma.learningPath.deleteMany({
      where: {
        userId: { in: anonymousUserIds },
        createdAt: { lt: identityExpiry },
      },
    });

    // 3. Delete the orphaned anonymous users themselves (we already deleted their paths)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { in: anonymousUserIds },
        createdAt: { lt: identityExpiry },
      },
    });

    return NextResponse.json({
      success: true,
      deletedPaths: deletedPaths.count,
      deletedOrphanedUsers: deletedUsers.count,
      message: "Anonymous path cleanup completed successfully",
    });
  } catch (error) {
    console.error("Anonymous path cleanup failed:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}