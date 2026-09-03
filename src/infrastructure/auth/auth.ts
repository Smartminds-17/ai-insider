import { cookies } from "next/headers";
import { prisma } from "@/infrastructure/db/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";

const ANON_COOKIE_NAME = "ai_insider_uid";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as { id: string }).id = user.id;
      }
      return session;
    },
  },
  events: {
    // Runs server-side as part of the sign-in lifecycle, so it can read the
    // httpOnly anonymous cookie (client JS can't — that's what made the old
    // SignInButton-driven migration unreachable). This fires every sign-in,
    // not just the first, but is a no-op once the anon cookie is gone.
    async signIn({ user }) {
      try {
        const cookieStore = cookies();
        const anonUserId = cookieStore.get(ANON_COOKIE_NAME)?.value;

        if (!anonUserId || anonUserId === user.id) return;

        const anonUser = await prisma.user.findUnique({ where: { id: anonUserId } });
        if (!anonUser) return; // already migrated (or never existed) — nothing to do

        await prisma.$transaction([
          prisma.learningPath.updateMany({
            where: { userId: anonUserId },
            data: { userId: user.id },
          }),
          prisma.progress.updateMany({
            where: { userId: anonUserId },
            data: { userId: user.id },
          }),
          prisma.user.delete({ where: { id: anonUserId } }),
        ]);

        // Note: we deliberately don't try to clear the anon cookie here.
        // NextAuth v4's App Router route handler builds its response from
        // its own internal cookie list (see next-auth/next/utils.js
        // toResponse()), not from Next's native cookies() mutation store —
        // so a cookies().delete() call from inside an events.signIn handler
        // has no effect on the actual response. This is harmless: the
        // browser keeps a cookie pointing at an already-deleted anon user,
        // and getOrCreateUserId.ts already handles that case (a lookup miss
        // there mints a fresh anonymous user and overwrites the cookie) the
        // next time an unauthenticated request needs it.
      } catch (err) {
        // NextAuth does not catch errors thrown from events.signIn — an
        // uncaught error here would break the sign-in itself, which is worse
        // than a failed migration. Log and let sign-in complete regardless.
        console.error("Anonymous path migration failed", err);
      }
    },
  },
  pages: {
    signIn: "/",
  },
};

export default NextAuth(authOptions);