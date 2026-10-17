'use client';

import { Calendar, Check, MessageCircle, Star, X } from 'lucide-react';
import { useState } from 'react';

interface MentorshipCardProps {
  mentorship: any;
  isMentee: boolean;
}

export default function MentorshipCard({ mentorship, isMentee }: MentorshipCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const otherUser = isMentee ? mentorship.mentor.user : mentorship.mentee;
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-600',
    ACCEPTED: 'bg-green-600',
    REJECTED: 'bg-red-600',
    COMPLETED: 'bg-blue-600'
  };

  const updateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      await fetch('/api/mentorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mentorshipId: mentorship.id, status })
      });
      // Refresh data (would usually trigger SWR revalidation)
      window.location.reload();
    } catch (error) {
      console.error('Error updating mentorship:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      {/* Header with user and status */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={otherUser.image || '/default-avatar.png'}
          alt={otherUser.name || 'User'}
          className="w-14 h-14 rounded-full object-cover bg-gray-600"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{otherUser.name || 'Unknown User'}</h3>
          <span className={`inline-block px-2 py-0.5 text-xs rounded-full text-white mt-1 ${statusColors[mentorship.status]}`}>
            {mentorship.status}
          </span>
        </div>
      </div>

      {/* Dates and session info */}
      <div className="space-y-2 mb-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>Started: {new Date(mentorship.createdAt).toLocaleDateString()}</span>
        </div>
        {mentorship.sessions && (
          <div className="flex items-center gap-2">
            <MessageCircle size={16} />
            <span>{mentorship.sessions.length} sessions completed</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!isMentee && mentorship.status === 'PENDING' && (
          <>
            <button
              onClick={() => updateStatus('ACCEPTED')}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Check size={16} /> Accept
            </button>
            <button
              onClick={() => updateStatus('REJECTED')}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              <X size={16} /> Decline
            </button>
          </>
        )}

        {mentorship.status === 'ACCEPTED' && (
          <>
            <a
              href="/chat"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <MessageCircle size={16} /> Chat
            </a>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              <Calendar size={16} /> Schedule
            </button>
          </>
        )}

        {mentorship.status === 'ACCEPTED' && isMentee && (
          <button
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Star size={16} /> Review
          </button>
        )}

        {mentorship.status === 'ACCEPTED' && (
          <button
            onClick={() => updateStatus('COMPLETED')}
            disabled={isUpdating}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            Complete Mentorship
          </button>
        )}
      </div>
    </div>
  );
}