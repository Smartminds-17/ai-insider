'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useSWR from 'swr';
import MentorshipCard from './MentorshipCard';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MentorshipDashboard() {
  const { data, error, isLoading } = useSWR('/api/mentorships', fetcher);

  const mentorships = data?.mentorships || [];
  const asMentee = mentorships.filter((m: any) => m.menteeId === 'current-user-id');
  const asMentor = mentorships.filter((m: any) => m.mentor.userId === 'current-user-id');

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

  if (error) {
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
            {asMentee.map((mentorship: any) => (
              <MentorshipCard key={mentorship.id} mentorship={mentorship} isMentee={true} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800 rounded-xl">
            <h3 className="text-xl font-semibold mb-2">No mentorships yet</h3>
            <p className="text-gray-400 mb-4">Find a mentor to start your learning journey.</p>
            <a href="/mentors" className="inline-block px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Browse Mentors
            </a>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="as-mentor">
        {asMentor.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {asMentor.map((mentorship: any) => (
              <MentorshipCard key={mentorship.id} mentorship={mentorship} isMentee={false} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800 rounded-xl">
            <h3 className="text-xl font-semibold mb-2">No mentees yet</h3>
            <p className="text-gray-400 mb-4">Become a mentor to help others on their learning journey.</p>
            <a href="/dashboard/mentors/create" className="inline-block px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Create Mentor Profile
            </a>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}