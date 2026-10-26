'use client';

import { Mentorship } from '@/app/types/mentorship';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import useSWR from 'swr';
import MentorshipCard from './MentorshipCard';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Client-side tier validation (matches server-side logic in layout.tsx)
function getUserTier(stripePriceId: string | null | undefined) {
  // Free tier (Day hike) by default
  if (!stripePriceId) {
    return { name: "Day hike", chipClass: "chip--ink", isFree: true, canAccessMentorship: false };
  }
  
  // Thru-hike tier ($9/mo) - still no mentorship access
  if (stripePriceId === process.env.NEXT_PUBLIC_STRIPE_THRU_HIKE_PRICE_ID) {
    return { name: "Thru-hike", chipClass: "chip--route", isFree: false, canAccessMentorship: false };
  }
  
  // Guided expedition tier ($39/mo) - only tier with mentorship access
  if (stripePriceId === process.env.NEXT_PUBLIC_STRIPE_GUIDED_EXPEDITION_PRICE_ID) {
    return { name: "Guided expedition", chipClass: "chip--sage", isFree: false, canAccessMentorship: true };
  }
  
  // Fallback to free tier for unknown price IDs
  return { name: "Day hike", chipClass: "chip--ink", isFree: true, canAccessMentorship: false };
}

export default function MentorshipDashboard() {
  const { data: session } = useSession();
  // @ts-expect-error - session.user includes stripe_price_id from our auth system that's not in the default types
  const userTier = getUserTier(session?.user?.stripe_price_id);
  
  // Only fetch mentorship data if user has access to the program
  const { data: menteeData, error: menteeError, isLoading: menteeLoading } = useSWR(
    session?.user?.id && userTier.canAccessMentorship ? '/api/mentorships?asMentee=true' : null,
    fetcher,
  );
  const { data: mentorData, error: mentorError, isLoading: mentorLoading } = useSWR(
    session?.user?.id && userTier.canAccessMentorship ? '/api/mentorships?asMentor=true' : null,
    fetcher,
  );

  const asMentee = Array.isArray(menteeData) ? menteeData : [];
  const asMentor = Array.isArray(mentorData) ? mentorData : [];
  const isLoading = menteeLoading || mentorLoading;

  // Block access for users who don't meet the tier requirement
  if (!userTier.canAccessMentorship) {
    return (
      <div className="surface-card py-16 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-amber-500" />
        </div>
        <h3 className="mb-3 text-2xl font-medium">Mentorship program is locked</h3>
        <p className="mb-8 text-[var(--text-dim)] text-lg">
          The 1:1 mentorship program is only available to our Guided expedition subscribers. 
          Upgrade your plan to unlock access to experienced mentors, scheduled sessions, and personalized guidance.
        </p>
        <Link href="/#pricing" className="btn btn--sage inline-flex items-center gap-2 text-lg px-8 py-3">
          Upgrade to Guided expedition
        </Link>
        <div className="mt-8 p-4 bg-[var(--surface-subtle)] rounded-lg">
          <p className="text-sm text-[var(--text-dim)]">
            Your current tier: <span className={`chip ${userTier.chipClass} ml-2`}>{userTier.name}</span>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse">
            <div className="h-16 bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (menteeError || mentorError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 text-lg">Failed to load your mentorships. Please try again later.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="as-mentee" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="as-mentee">As Mentee ({asMentee.length})</TabsTrigger>
        <TabsTrigger value="as-mentor">As Mentor ({asMentor.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="as-mentee">
        {asMentee.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {asMentee.map((mentorship: Mentorship) => (
              mentorship && <MentorshipCard key={mentorship.id} mentorship={mentorship} isMentee={true} />
            ))}
          </div>
        ) : (
          <div className="surface-card py-12 text-center">
            <h3 className="mb-2 text-xl font-medium">No mentorships yet</h3>
            <p className="mb-4 text-[var(--text-dim)]">Find a mentor to start your learning journey.</p>
            <a href="/mentors" className="btn btn--route">
              Browse Mentors
            </a>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="as-mentor">
        {asMentor.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {asMentor.map((mentorship: Mentorship) => (
              mentorship && <MentorshipCard key={mentorship.id} mentorship={mentorship} isMentee={false} />
            ))}
          </div>
        ) : (
          <div className="surface-card py-12 text-center">
            <h3 className="mb-2 text-xl font-medium">No mentees yet</h3>
            <p className="mb-4 text-[var(--text-dim)]">Become a mentor to help others on their learning journey.</p>
            <a href="/dashboard/mentors/create" className="btn btn--route">
              Create Mentor Profile
            </a>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}