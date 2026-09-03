import { prisma } from "@/infrastructure/db/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

const ANON_COOKIE_NAME = "ai_insider_uid";

const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  adapter: hasGoogleCredentials ? PrismaAdapter(prisma) as Adapter : undefined,
  providers: hasGoogleCredentials ? [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ] : [],
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
    // Runs server-side as part of the sign-in lifecycle, but migrates anonymous
    // data in the background to avoid blocking the OAuth callback redirect
    async signIn({ user }) {
      const cookieStore = await cookies();
      const anonUserId = cookieStore.get(ANON_COOKIE_NAME)?.value;

      if (!anonUserId || anonUserId === user.id) return;

      // Fire AND FORGET the migration - don't block the sign-in flow!
      // This fixes the 5-6s OAuth callback delay while still migrating data
      (async () => {
        try {
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
          console.log("Successfully migrated anonymous user data to", user.id);
        } catch (err) {
          console.error("Anonymous path migration failed", err);
        }
      })();
    },
  },
  pages: {
    signIn: "/",
  },
};

export default NextAuth(authOptions);