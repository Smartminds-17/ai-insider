import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/auth";
import { getOrCreateUserId } from "@/infrastructure/auth/getOrCreateUserId";

export async function POST() {
  const session = await getServerSession(authOptions);
  const authUser = session?.user as { id: string } | undefined;
  if (!authUser?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await getOrCreateUserId();
  return NextResponse.json({ migrated: true });
}
