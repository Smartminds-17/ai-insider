import { prisma } from "@/infrastructure/db/prisma";

// Use type assertion to bypass outdated Prisma client types (models exist at runtime)
const p = prisma as unknown as {
  user: { findUnique: (...args: unknown[]) => Promise<unknown>; delete: (...args: unknown[]) => Promise<unknown> };
  goal: { updateMany: (...args: unknown[]) => Promise<unknown> };
  learningPath: { updateMany: (...args: unknown[]) => Promise<unknown> };
  progress: { findMany: (...args: unknown[]) => Promise<unknown[]>; findUnique: (...args: unknown[]) => Promise<unknown>; update: (...args: unknown[]) => Promise<unknown>; delete: (...args: unknown[]) => Promise<unknown> };
  $transaction: (calls: unknown[]) => Promise<unknown>;
};

// Moves Goal / LearningPath / Progress from a cookie identity onto the
// signed-in Google user so history survives logout → login.
export async function mergeAnonymousUser(anonUserId: string, authUserId: string) {
  if (!anonUserId || anonUserId === authUserId) return;

  try {
    const anon = await p.user.findUnique({ where: { id: anonUserId } });
    if (!anon) return;

    const auth = await p.user.findUnique({ where: { id: authUserId } });
    if (!auth) return;

    // Update goals and learning paths first (these use the main prisma client, which has goal model)
    await p.goal.updateMany({
      where: { userId: anonUserId },
      data: { userId: authUserId },
    });
    await p.learningPath.updateMany({
      where: { userId: anonUserId },
      data: { userId: authUserId },
    });

    // Only handle progress records in a transaction to avoid race conditions
    const anonProgress = await p.progress.findMany({ where: { userId: anonUserId } });
    const progressTransactions = [];
    
    for (const row of anonProgress) {
      const progressRow = row as { id: string; videoId: string; watched: boolean; watchedAt?: Date; userId: string };
      const existing = await p.progress.findUnique({
        where: { userId_videoId: { userId: authUserId, videoId: progressRow.videoId } },
      });
      if (existing) {
          const existingProgress = existing as { id: string; watched: boolean };
          if (progressRow.watched && !existingProgress.watched) {
            progressTransactions.push(
              p.progress.update({
                where: { id: existingProgress.id },
                data: { watched: true, watchedAt: progressRow.watchedAt ?? new Date() },
              })
            );
          }
          progressTransactions.push(
            p.progress.delete({ where: { id: progressRow.id } })
          );
        } else {
          progressTransactions.push(
            p.progress.update({
              where: { id: progressRow.id },
              data: { userId: authUserId },
            })
          );
        }
    }

    // Add the user deletion to the transaction list
    progressTransactions.push(p.user.delete({ where: { id: anonUserId } }));

    // Execute all progress operations + deletion in a single transaction
    if (progressTransactions.length > 0) {
      await p.$transaction(progressTransactions);
    }
  } catch (error) {
    // Log the error but don't crash the entire request - anonymous user merge is non-critical
    console.error("⚠️ Failed to merge anonymous user data:", {
      error: error instanceof Error ? error.message : "Unknown error",
      code: (error as { code?: string })?.code,
      anonUserId,
      authUserId
    });
    // Gracefully fail - user can still use the app, just won't have their anonymous history merged
    return;
  }
}