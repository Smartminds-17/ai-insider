'use client';

import { useState } from 'react';
import useSWR from 'swr';
import MentorCard from './MentorCard';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MentorDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string | null>(null);

  // Fetch mentors with filters
  const { data, error, isLoading } = useSWR(
    `/api/mentors${selectedExpertise ? `?expertise=${selectedExpertise}` : ''}`,
    fetcher
  );

  const mentors = data?.mentors || [];
  const commonExpertises = [
    'Web Development', 'Mobile Development', 'Data Science', 
    'Machine Learning', 'Cloud Computing', 'DevOps', 'Cybersecurity',
    'Blockchain', 'UI/UX Design', 'Product Management'
  ];

  const filteredMentors = mentors.filter((mentor: any) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesName = mentor.user.name?.toLowerCase().includes(searchLower);
      const matchesBio = mentor.bio?.toLowerCase().includes(searchLower);
      const matchesExpertise = mentor.expertise.some((exp: string) => 
        exp.toLowerCase().includes(searchLower)
      );
      if (!matchesName && !matchesBio && !matchesExpertise) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Search and Filter Section */}
      <div className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="Search mentors by name, skill, or bio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-lg rounded-xl border border-white/10 bg-[var(--ink-2)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--route)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--route)]/50"
        />
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedExpertise(null)}
            className={`text-sm transition-colors ${
              !selectedExpertise 
                ? 'chip chip--route'
                : 'chip chip--ink'
            }`}
          >
            All
          </button>
          {commonExpertises.slice(0, 8).map((expertise) => (
            <button
              key={expertise}
              onClick={() => setSelectedExpertise(expertise)}
            className={`text-sm transition-colors ${
                selectedExpertise === expertise
                  ? 'chip chip--route'
                  : 'chip chip--ink'
              }`}
            >
              {expertise}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-24 bg-gray-700 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-400 text-lg">Failed to load mentors. Please try again later.</p>
        </div>
      )}

      {/* Mentor Grid */}
      {!isLoading && !error && (
        <>
          {filteredMentors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map((mentor: any) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">No mentors found</h3>
              <p className="text-gray-400">Try adjusting your search or filters to find more mentors.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
