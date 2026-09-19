import { authOptions } from "@/infrastructure/auth/auth";
import { mergeAnonymousUser } from "@/infrastructure/auth/mergeAnonymousUser";
import { prisma } from "@/infrastructure/db/prisma";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";

export const COOKIE_NAME = "ai_insider_uid";

// Persistent cookie options for AUTHENTICATED users (30 days)
function persistentCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    secure: process.env.NODE_ENV === "production",
  };
}

// 1-hour TTL cookie for ANONYMOUS users (expires after 1 hour, deleted on refresh/browser close)
function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 3600, // 1 hour — matches path TTL, deleted after that OR when browser is closed
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
        try {
          await mergeAnonymousUser(cookieId, authUser.id);
        } catch (mergeError) {
          console.error("⚠️ mergeAnonymousUser call failed in getOrCreateUserId:", {
            error: mergeError instanceof Error ? mergeError.message : "Unknown error",
            cookieId,
            authUserId: authUser.id
          });
          // Continue execution - merge failure is non-critical
        }
      }
    }
    // Always set the cookie to the current authenticated user's ID (PERSISTENT)
    try {
      cookieStore.set(COOKIE_NAME, authUser.id, persistentCookieOptions());
    } catch (cookieError) {
      console.error("⚠️ Failed to set authenticated user cookie:", cookieError);
    }
    return authUser.id;
  }

  if (cookieId) {
    const user = await prisma.user.findUnique({ where: { id: cookieId } });
    if (user) return user.id;
  }

  // Create NEW anonymous user — set SESSION-ONLY cookie (deleted on refresh/browser close)
  const newUser = await prisma.user.create({ data: {} });
  cookieStore.set(COOKIE_NAME, newUser.id, sessionCookieOptions());
  return newUser.id;
}