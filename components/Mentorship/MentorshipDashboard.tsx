'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import MentorshipCard from './MentorshipCard';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MentorshipDashboard() {
  const { data: session } = useSession();
  const { data: menteeData, error: menteeError, isLoading: menteeLoading } = useSWR(
    session?.user?.id ? '/api/mentorships?asMentee=true' : null,
    fetcher,
  );
  const { data: mentorData, error: mentorError, isLoading: mentorLoading } = useSWR(
    session?.user?.id ? '/api/mentorships?asMentor=true' : null,
    fetcher,
  );

  const asMentee = Array.isArray(menteeData) ? menteeData : [];
  const asMentor = Array.isArray(mentorData) ? mentorData : [];
  const isLoading = menteeLoading || mentorLoading;

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
            {asMentee.map((mentorship: { id: string }) => (
              <MentorshipCard key={mentorship.id} mentorship={mentorship} isMentee={true} />
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
            {asMentor.map((mentorship: { id: string }) => (
              <MentorshipCard key={mentorship.id} mentorship={mentorship} isMentee={false} />
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
