import { prisma } from "@/infrastructure/db/prisma";

// Moves Goal / LearningPath / Progress from a cookie identity onto the
// signed-in Google user so history survives logout → login.
export async function mergeAnonymousUser(anonUserId: string, authUserId: string) {
  if (!anonUserId || anonUserId === authUserId) return;

  const anon = await prisma.user.findUnique({ where: { id: anonUserId } });
  if (!anon) return;

  const auth = await prisma.user.findUnique({ where: { id: authUserId } });
  if (!auth) return;

  // First, update all goals and learning paths
  await prisma.goal.updateMany({
    where: { userId: anonUserId },
    data: { userId: authUserId },
  });
  await prisma.learningPath.updateMany({
    where: { userId: anonUserId },
    data: { userId: authUserId },
  });

  // Handle progress records with transaction to avoid race conditions
  const anonProgress = await prisma.progress.findMany({ where: { userId: anonUserId } });
  const progressTransactions = [];
  
  for (const row of anonProgress) {
    const existing = await prisma.progress.findUnique({
      where: { userId_videoId: { userId: authUserId, videoId: row.videoId } },
    });
    if (existing) {
      if (row.watched && !existing.watched) {
        progressTransactions.push(
          prisma.progress.update({
            where: { id: existing.id },
            data: { watched: true, watchedAt: row.watchedAt ?? new Date() },
          })
        );
      }
      progressTransactions.push(
        prisma.progress.delete({ where: { id: row.id } })
      );
    } else {
      progressTransactions.push(
        prisma.progress.update({
          where: { id: row.id },
          data: { userId: authUserId },
        })
      );
    }
  }

  // Add the user deletion to the transaction list
  progressTransactions.push(prisma.user.delete({ where: { id: anonUserId } }));

  // Execute all progress operations + deletion in a single transaction
  if (progressTransactions.length > 0) {
    await prisma.$transaction(progressTransactions);
  }
}