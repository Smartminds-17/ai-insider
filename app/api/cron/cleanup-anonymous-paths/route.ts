import { prisma } from "@/infrastructure/db/prisma";
import { NextRequest, NextResponse } from "next/server";

// Cleanup job: Delete all anonymous user paths older than 24 hours
// Callable via Supabase Cron: POST /api/cron/cleanup-anonymous-paths?secret=YOUR_INTERNAL_API_SECRET
export async function POST(req: NextRequest) {
  // Verify internal request
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    return NextResponse.json({ error: "Internal API not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const requestSecret = searchParams.get("secret");
  if (requestSecret !== internalSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Find all anonymous users (no email)
    const anonymousUsers = await prisma.user.findMany({
      where: { email: null },
      select: { id: true },
    });
    const anonymousUserIds = anonymousUsers.map(u => u.id);

    // 2. Delete all their paths older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deletedPaths = await prisma.learningPath.deleteMany({
      where: {
        userId: { in: anonymousUserIds },
        createdAt: { lt: twentyFourHoursAgo },
      },
    });

    // 3. Delete the orphaned anonymous users themselves (we already deleted their paths)
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { in: anonymousUserIds },
        createdAt: { lt: twentyFourHoursAgo },
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