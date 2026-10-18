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
    PENDING: 'chip--route',
    ACCEPTED: 'chip--sage',
    REJECTED: 'chip--ink',
    COMPLETED: 'chip--ink'
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
    <article className="surface-card p-5 sm:p-6">
      {/* Header with user and status */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={otherUser.image || '/default-avatar.png'}
          alt={otherUser.name || 'User'}
          className="w-14 h-14 rounded-full object-cover bg-gray-600"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{otherUser.name || 'Unknown User'}</h3>
          <span className={`chip mt-1 ${statusColors[mentorship.status]}`}>
            {mentorship.status}
          </span>
        </div>
      </div>

      {/* Dates and session info */}
      <div className="mb-5 space-y-2 text-sm text-[var(--text-dim)]">
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
              className="btn btn--sage"
            >
              <Check size={16} /> Accept
            </button>
            <button
              onClick={() => updateStatus('REJECTED')}
              disabled={isUpdating}
              className="btn btn--ink"
            >
              <X size={16} /> Decline
            </button>
          </>
        )}

        {mentorship.status === 'ACCEPTED' && (
          <>
            <a
              href="/chat"
              className="btn btn--route"
            >
              <MessageCircle size={16} /> Chat
            </a>
            <button
              className="btn btn--ink"
            >
              <Calendar size={16} /> Schedule
            </button>
          </>
        )}

        {mentorship.status === 'ACCEPTED' && isMentee && (
          <button
              className="btn btn--route"
          >
            <Star size={16} /> Review
          </button>
        )}

        {mentorship.status === 'ACCEPTED' && (
          <button
            onClick={() => updateStatus('COMPLETED')}
            disabled={isUpdating}
              className="btn btn--ink"
          >
            Complete Mentorship
          </button>
        )}
      </div>
    </article>
  );
}
