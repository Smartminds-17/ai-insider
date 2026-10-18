import { getCommunityRoot } from "@/domain/communityRoot";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";

/** Create or reuse the learner's topic community inside an existing transaction. */
export async function assignLearningCommunity(
  tx: Prisma.TransactionClient,
  userId: string,
  prompt: string,
): Promise<string | null> {
  const root = getCommunityRoot(prompt);
  if (!root) return null;

  const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
  // Chat requires a signed-in account; anonymous paths stay private.
  if (!user?.email) return null;

  const community = await tx.conversation.upsert({
    where: { communityKey: root.key },
    create: {
      type: "GROUP",
      name: `${root.label} learners`,
      description: `A learning community for ${root.label}.`,
      communityKey: root.key,
      topicTags: [root.key],
    },
    update: {},
    select: { id: true },
  });

  const membership = await tx.conversationParticipant.createMany({
    data: [{ conversationId: community.id, userId, role: "MEMBER" }],
    skipDuplicates: true,
  });

  if (membership.count > 0) {
    await tx.conversation.update({
      where: { id: community.id },
      data: { memberCount: { increment: membership.count } },
    });
  }

  return community.id;
}

/** Idempotently backfill community assignment for an existing owned path. */
export async function ensureLearningCommunity(userId: string, prompt: string): Promise<string | null> {
  const root = getCommunityRoot(prompt);
  if (!root) return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return null;

  const existing = await prisma.conversation.findUnique({
    where: { communityKey: root.key },
    select: {
      id: true,
      participants: { where: { userId }, select: { id: true }, take: 1 },
    },
  });

  if (existing?.participants.length) return existing.id;

  return prisma.$transaction((tx) => assignLearningCommunity(tx, userId, prompt));
}
