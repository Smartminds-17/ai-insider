'use client';

import { Clock, MessageSquare, Star } from 'lucide-react';
import { useState } from 'react';

interface MentorCardProps {
  mentor: any;
}

export default function MentorCard({ mentor }: MentorCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const requestMentorship = async () => {
    setIsRequesting(true);
    try {
      const res = await fetch('/api/mentorships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorId: mentor.id })
      });

      if (res.ok) {
        setRequestSent(true);
      }
    } catch (error) {
      console.error('Error requesting mentorship:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <article className="surface-card flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl hover:shadow-black/20 sm:p-6">
      {/* Mentor Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <img
            src={mentor.user.image || '/default-avatar.png'}
            alt={mentor.user.name || 'Mentor'}
            className="w-16 h-16 rounded-full object-cover bg-gray-600"
          />
          <span 
            className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-800 ${
              mentor.user.isOnline ? 'bg-green-500' : 'bg-gray-500'
            }`}
            title={mentor.user.isOnline ? 'Online now' : 'Offline'}
          ></span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{mentor.user.name || 'Anonymous Mentor'}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-dim)]">
            {mentor.averageRating && (
              <span className="flex items-center gap-1">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                {mentor.averageRating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {mentor.availability ? 'Available' : 'Unavailable'}
            </span>
            {mentor.user.isOnline && (
              <span className="text-green-400 text-xs">● Online</span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {mentor.bio && (
        <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-[var(--text-dim)]">{mentor.bio}</p>
      )}

      {/* Expertise Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {mentor.expertise?.slice(0, 4).map((skill: string, i: number) => (
          <span
            key={i}
            className="chip chip--ink"
          >
            {skill}
          </span>
        ))}
        {mentor.expertise?.length > 4 && (
          <span className="chip chip--ink">
            +{mentor.expertise.length - 4} more
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
        {mentor.hourlyRate && (
          <span className="text-green-400 font-semibold">${mentor.hourlyRate}/hr</span>
        )}
        <span className="text-sm text-gray-400">{mentor.totalMenteeCount} mentees</span>
      </div>

      {/* Action Button */}
      <button
        onClick={requestMentorship}
        disabled={isRequesting || requestSent || !mentor.availability}
        className={`btn mt-4 w-full justify-center ${
          requestSent
            ? 'btn--sage cursor-default'
            : !mentor.availability
            ? 'btn--ink cursor-not-allowed opacity-50'
            : 'btn--route'
        }`}
      >
        {requestSent ? (
          <>Request Sent <MessageSquare size={18} /></>
        ) : !mentor.availability ? (
          'Unavailable'
        ) : (
          <>Request Mentorship <MessageSquare size={18} /></>
        )}
      </button>
    </article>
  );
}
