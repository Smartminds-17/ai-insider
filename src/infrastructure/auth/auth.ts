import { prisma } from "@/infrastructure/db/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        // Sync Google profile fields to User model every login
        const googleProfile = profile as Record<string, unknown>;
        return {
          id: googleProfile.sub as string,
          name: googleProfile.name as string | undefined,
          email: googleProfile.email as string,
          image: googleProfile.picture as string | undefined, // This is Google's profile picture URL
          emailVerified: googleProfile.email_verified as boolean | undefined,
        } as never;
      },
    }),
  ],
  session: {
    strategy: "database",
    // Add session expiry to prevent infinite sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, profile }) {
      // If user exists, update their image/name to the latest from Google
      const googleProfile = profile as { picture?: string; name?: string };
      if (user.id && googleProfile.picture) {
        // Only update fields if they're not null/undefined to avoid DB errors
        const updateData: { image: string; name?: string } = {
          image: googleProfile.picture!,
        };
        if (googleProfile.name) {
          updateData.name = googleProfile.name;
        }
        // Gracefully handle first login (user doesn't exist yet in DB, PrismaAdapter creates them)
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        } catch (err) {
          // If update fails, it's because the user is being created for the first time — no problem!
          console.log("First login, skipping update (user will be created with correct data)");
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as { id: string }).id = user.id;
        // Also include the image in the session so the client can access it
        if (user.image) {
          (session.user as { image?: string }).image = user.image;
        } else {
          // Convert null to undefined to match type requirements
          (session.user as { image?: string }).image = undefined;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    signOut: "/",
  },
};

export default NextAuth(authOptions);