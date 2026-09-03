import { authOptions } from "@/infrastructure/auth/auth";
import { mergeAnonymousUser } from "@/infrastructure/auth/mergeAnonymousUser";
import { prisma } from "@/infrastructure/db/prisma";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";

export const COOKIE_NAME = "ai_insider_uid";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  };
}

// Returns the current user's ID — authenticated (via NextAuth) or anonymous (via cookie).
// When both exist, anonymous goals/progress are merged onto the Google user.
export async function getOrCreateUserId(): Promise<string> {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(COOKIE_NAME)?.value;

  const session = await getServerSession(authOptions);
  const authUser = session?.user as { id: string } | undefined;
  
  // Critical: If we have an authenticated user, they MUST have a valid session
  if (authUser?.id) {
    // Only merge anonymous data if the cookie contains a DIFFERENT anonymous ID
    // Never reuse a cookie ID from a previous authenticated user
    if (cookieId && cookieId !== authUser.id) {
      // Check if the cookie ID is actually an anonymous user (not another authenticated user)
      const cookieUser = await prisma.user.findUnique({
        where: { id: cookieId },
        select: { email: true } // Only select email to check if it's an anonymous user (no email)
      });
      
      // Only merge if it's a true anonymous user (no email, which all Google users have)
      if (cookieUser && !cookieUser.email) {
        await mergeAnonymousUser(cookieId, authUser.id);
      }
    }
    // Always set the cookie to the current authenticated user's ID
    cookieStore.set(COOKIE_NAME, authUser.id, cookieOptions());
    return authUser.id;
  }

  if (cookieId) {
    const user = await prisma.user.findUnique({ where: { id: cookieId } });
    if (user) return user.id;
  }

  const newUser = await prisma.user.create({ data: {} });
  cookieStore.set(COOKIE_NAME, newUser.id, cookieOptions());
  return newUser.id;
}