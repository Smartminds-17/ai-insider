import { authOptions } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/db/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const authUser = session?.user as { id: string } | undefined;
  if (!authUser?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const anonUserId = body.anonUserId;

  if (!anonUserId || anonUserId === authUser.id) {
    return NextResponse.json({ migrated: false, reason: "No anonymous user to migrate" });
  }

  const anonUser = await prisma.user.findUnique({ where: { id: anonUserId } });
  if (!anonUser) {
    return NextResponse.json({ migrated: false, reason: "Anonymous user not found" });
  }

  await prisma.$transaction([
    prisma.learningPath.updateMany({
      where: { userId: anonUserId },
      data: { userId: authUser.id },
    }),
    prisma.progress.updateMany({
      where: { userId: anonUserId },
      data: { userId: authUser.id },
    }),
    prisma.user.delete({ where: { id: anonUserId } }),
  ]);

  return NextResponse.json({ migrated: true });
}