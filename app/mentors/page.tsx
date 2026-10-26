import Link from 'next/link';
import MentorDirectory from '@/components/Mentorship/MentorDirectory';
import { authOptions } from "@/infrastructure/auth/auth";
import { prisma } from "@/src/infrastructure/db/prisma";
import { Lock } from 'lucide-react';
import { getServerSession } from 'next-auth/next';

// Server-side tier validation (matches layout.tsx logic)
function getUserTier(stripePriceId: string | null | undefined) {
  if (!stripePriceId) {
    return { name: "Day hike", chipClass: "chip--ink", isFree: true, canAccessMentorship: false };
  }
  if (stripePriceId === process.env.STRIPE_THRU_HIKE_PRICE_ID) {
    return { name: "Thru-hike", chipClass: "chip--route", isFree: false, canAccessMentorship: false };
  }
  if (stripePriceId === process.env.STRIPE_GUIDED_EXPEDITION_PRICE_ID) {
    return { name: "Guided expedition", chipClass: "chip--sage", isFree: false, canAccessMentorship: true };
  }
  return { name: "Day hike", chipClass: "chip--ink", isFree: true, canAccessMentorship: false };
}

export default async function MentorsPage() {
  // Fetch user's tier server-side to secure the page
  const session = await getServerSession(authOptions);
  let userTier = { name: "Day hike", chipClass: "chip--ink", isFree: true, canAccessMentorship: false };
  
  if (session?.user?.email) {
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { stripe_price_id: true }
    });
    userTier = getUserTier(currentUser?.stripe_price_id);
  }

  // If user doesn't have access, show locked state (different message for logged vs unlogged)
  if (!userTier.canAccessMentorship) {
    const isUnlogged = !session?.user;
    
    return (
      <main className="mx-auto min-h-[calc(100dvh-64px)] w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="surface-card py-20 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-8">
            <Lock size={40} className="text-amber-500" />
          </div>
          <h2 className="mb-4 text-3xl font-medium">Mentorship Program Locked</h2>
          <p className="mb-10 text-[var(--text-dim)] text-xl">
            {isUnlogged 
              ? "Unlock access to our directory of experienced mentors and book 1:1 sessions to accelerate your learning. Sign in and upgrade to the Guided expedition plan to get started."
              : "Browse our directory of experienced mentors and book 1:1 sessions to accelerate your learning. This feature is exclusively available to Guided expedition subscribers."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isUnlogged && (
              <Link href="/login" className="btn btn--outline inline-flex items-center justify-center gap-2 text-lg px-10 py-4">
                Sign In First
              </Link>
            )}
            <Link href="/#pricing" className="btn btn--sage inline-flex items-center justify-center gap-2 text-lg px-10 py-4">
               {isUnlogged ? "View Pricing Plans" : "Upgrade Your Plan"}
             </Link>
          </div>
          {!isUnlogged && (
            <div className="mt-10 p-5 bg-[var(--surface-subtle)] rounded-lg max-w-md mx-auto">
              <p className="text-base text-[var(--text-dim)]">
                Your current tier: <span className={`chip ${userTier.chipClass} ml-2 text-sm`}>{userTier.name}</span>
              </p>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Only show mentor directory if user has access
  return (
    <main className="mx-auto min-h-[calc(100dvh-64px)] w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="mb-9 border-b border-white/10 pb-7">
        <span className="legend-label legend-label--sage mb-3 block">Guidance for your next step</span>
        <h1 className="font-display mb-2 text-3xl font-medium sm:text-4xl">Find a Mentor</h1>
        <p className="max-w-2xl text-[var(--text-dim)] sm:text-lg">Connect with experienced mentors to guide your learning journey.</p>
      </div>
      <MentorDirectory />
    </main>
  );
}