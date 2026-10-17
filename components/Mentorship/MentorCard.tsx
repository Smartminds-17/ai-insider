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
    <div className="bg-gray-800 rounded-xl p-6 hover:shadow-lg transition-shadow border border-gray-700">
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
          <div className="flex items-center gap-2 text-sm text-gray-400">
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
        <p className="text-gray-300 text-sm mb-4 line-clamp-3">{mentor.bio}</p>
      )}

      {/* Expertise Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {mentor.expertise?.slice(0, 4).map((skill: string, i: number) => (
          <span
            key={i}
            className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
          >
            {skill}
          </span>
        ))}
        {mentor.expertise?.length > 4 && (
          <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-full">
            +{mentor.expertise.length - 4} more
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        {mentor.hourlyRate && (
          <span className="text-green-400 font-semibold">${mentor.hourlyRate}/hr</span>
        )}
        <span className="text-sm text-gray-400">{mentor.totalMenteeCount} mentees</span>
      </div>

      {/* Action Button */}
      <button
        onClick={requestMentorship}
        disabled={isRequesting || requestSent || !mentor.availability}
        className={`w-full mt-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
          requestSent
            ? 'bg-green-600 text-white cursor-default'
            : !mentor.availability
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
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
    </div>
  );
}