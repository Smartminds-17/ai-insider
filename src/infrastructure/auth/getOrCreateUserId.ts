import { cookies } from "next/headers";
import { prisma } from "@/infrastructure/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/auth";

const COOKIE_NAME = "ai_insider_uid";

// Returns the current user's ID — authenticated (via NextAuth) or anonymous (via cookie).
export async function getOrCreateUserId(): Promise<string> {
  // 1. Check for authenticated session first
  const session = await getServerSession(authOptions);
  const authUser = session?.user as { id: string } | undefined;
  if (authUser?.id) {
    return authUser.id;
  }

  // 2. Fall back to anonymous cookie identity
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;

  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: existing } });
    if (user) return user.id;
  }

  // 3. Create new anonymous user
  const newUser = await prisma.user.create({ data: {} });
  cookieStore.set(COOKIE_NAME, newUser.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return newUser.id;
}