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
      const cookieStore = await cookies();
      const anonUserId = cookieStore.get(ANON_COOKIE_NAME)?.value;

      if (!anonUserId || anonUserId === user.id) return;

      const anonUser = await prisma.user.findUnique({ where: { id: anonUserId } });
      if (!anonUser) {
        cookieStore.delete(ANON_COOKIE_NAME);
        return;
      }

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

      cookieStore.delete(ANON_COOKIE_NAME);
    },
  },
  pages: {
    signIn: "/",
  },
};

export default NextAuth(authOptions);
