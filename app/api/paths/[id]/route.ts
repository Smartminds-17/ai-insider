import { getPath } from "@/application/getPath";
import { ensureLearningCommunity } from "@/application/learningCommunity";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { prisma } from "@/src/infrastructure/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOrCreateUserId();

  // A Vercel function can be stopped at maxDuration without running the
  // processor's catch handler. Convert an abandoned generation into a visible
  // failure on the next poll instead of leaving the route in a loading state.
  if (process.env.VERCEL === "1") {
    const staleBefore = new Date(Date.now() - 90 * 1000);
    await prisma.learningPath.updateMany({
      where: { id, userId, status: "GENERATING", createdAt: { lt: staleBefore } },
      data: { status: "FAILED" },
    });
  }

  const path = await getPath(id, userId);

  if (!path) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RESOURCE_NOT_FOUND", message: "Path not found" } },
      { status: 404 }
    );
  }

  // Backfill an assignment for paths created before topic communities existed.
  const communityId = await ensureLearningCommunity(userId, path.prompt);
  const community = communityId
    ? await prisma.conversation.findUnique({
        where: { id: communityId },
        select: { id: true, name: true },
      })
    : null;

  // Include only the matched community's name and ID, never another learner's path.
  return NextResponse.json({
    data: { ...path, community },
    meta: {},
    error: null,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOrCreateUserId();
  
  // First verify the path belongs to the user
  const path = await prisma.learningPath.findFirst({
    where: { id, userId }
  });
  
  if (!path) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RESOURCE_NOT_FOUND", message: "Path not found" } },
      { status: 404 }
    );
  }
  
  // Delete the path - all related records (topics, topicVideos) will be deleted automatically due to onDelete: Cascade in schema
  await prisma.learningPath.delete({
    where: { id }
  });
  
  return NextResponse.json({ data: { deleted: true }, meta: {}, error: null });
}