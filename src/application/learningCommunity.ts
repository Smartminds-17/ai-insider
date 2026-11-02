import { getCommunityRoot } from "@/domain/communityRoot";
import { prisma } from "@/infrastructure/db/prisma";
import type { Prisma } from "@prisma/client";

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

  // First try to find existing community to avoid race conditions with concurrent upserts
  let community = await tx.conversation.findUnique({
    where: { communityKey: root.key },
    select: { id: true },
  });

  if (!community) {
    try {
      // If not found, create it - if another request already created it, this will throw P2002
      community = await tx.conversation.create({
        data: {
          type: "GROUP",
          name: `${root.label} learners`,
          description: `A learning community for ${root.label}.`,
          communityKey: root.key,
          topicTags: [root.key],
        },
        select: { id: true },
      });
    } catch (e) {
      // If creation failed due to unique constraint violation, another request already created it
      if ((e as { code?: string }).code === 'P2002') {
        community = await tx.conversation.findUnique({
          where: { communityKey: root.key },
          select: { id: true },
        });
      }
      // If we still don't have a community, rethrow the error - it's unexpected
      if (!community) {
        throw e;
      }
    }
  }

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
      ConversationParticipant: { where: { userId }, select: { id: true }, take: 1 },
    },
  });

  if (existing?.ConversationParticipant.length) return existing.id;

  return prisma.$transaction((tx) => assignLearningCommunity(tx, userId, prompt));
}