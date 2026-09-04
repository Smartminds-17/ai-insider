import { getPath } from "@/application/getPath";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";
import { prisma } from "@/infrastructure/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getOrCreateUserId();
  const path = await getPath(id, userId);

  if (!path) {
    return NextResponse.json(
      { data: null, meta: {}, error: { code: "RESOURCE_NOT_FOUND", message: "Path not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: path, meta: {}, error: null });
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