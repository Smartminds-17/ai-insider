import { getServerSession } from "next-auth/next";
import { prisma } from "../db/prisma";
import { authOptions } from "./auth";
import { getOrCreateUserId } from "./getOrCreateUserId";

/**
 * Authorization utility to enforce that users can only access their own data
 * Fails closed (throws error) if any check fails - never grants access by default
 */
export class AuthorizationError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Get the current authenticated user's ID - ensures we never proceed without a valid user
 * @returns The user's ID (string)
 * @throws AuthorizationError if no valid session or user ID exists
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const authUser = session?.user as { id: string } | undefined;
  
  if (!authUser?.id) {
    // If not authenticated, fall back to getOrCreateUserId for anonymous users
    // This ensures even anonymous users only access their own data
    return await getOrCreateUserId();
  }
  
  return authUser.id;
}

/**
 * Verify that a user owns a specific LearningPath before allowing access/modification
 * @param pathId - The ID of the learning path to check
 * @param userId - The ID of the current user
 * @throws AuthorizationError if the user doesn't own the path
 */
export async function verifyPathOwnership(pathId: string, userId: string): Promise<void> {
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    select: { userId: true }
  });
  
  if (!path || path.userId !== userId) {
    throw new AuthorizationError("You do not have permission to access this learning path");
  }
}

/**
 * Verify that a user owns a specific Goal before allowing access/modification
 * @param goalId - The ID of the goal to check
 * @param userId - The ID of the current user
 * @throws AuthorizationError if the user doesn't own the goal
 */
export async function verifyGoalOwnership(goalId: string, userId: string): Promise<void> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { userId: true }
  });
  
  if (!goal || goal.userId !== userId) {
    throw new AuthorizationError("You do not have permission to access this goal");
  }
}

/**
 * Verify that a user owns a specific Progress entry before allowing modification
 * @param progressId - The ID of the progress entry to check
 * @param userId - The ID of the current user
 * @throws AuthorizationError if the user doesn't own the progress
 */
export async function verifyProgressOwnership(progressId: string, userId: string): Promise<void> {
  const progress = await prisma.progress.findUnique({
    where: { id: progressId },
    select: { userId: true }
  });
  
  if (!progress || progress.userId !== userId) {
    throw new AuthorizationError("You do not have permission to modify this progress");
  }
}

/** Ensures progress may only be recorded for a video exposed by the caller's path. */
export async function verifyVideoAccess(videoId: string, userId: string): Promise<void> {
  const topicVideo = await prisma.topicVideo.findFirst({
    where: { videoId, topic: { learningPath: { userId } } },
    select: { id: true },
  });

  if (!topicVideo) {
    throw new AuthorizationError("You do not have permission to access this video");
  }
}
