'use client';

import { Calendar, Check, MessageCircle, Star, X } from 'lucide-react';
import { useState } from 'react';

import { Mentorship } from "@/app/types/mentorship";


interface MentorshipCardProps {
  mentorship: Mentorship;
  isMentee: boolean;
}

export default function MentorshipCard({ mentorship, isMentee }: MentorshipCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState('');
  const [sessionEndTime, setSessionEndTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

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
        body: JSON.stringify({ 
          mentorshipId: mentorship.id, 
          action: 'updateStatus',
          status 
        })
      });
      window.location.reload();
    } catch (error) {
      console.error('Error updating mentorship:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const scheduleSession = async () => {
    if (!sessionTitle || !sessionDate || !sessionStartTime || !sessionEndTime) return;
    
    setIsUpdating(true);
    try {
      const startTime = new Date(`${sessionDate}T${sessionStartTime}`);
      const endTime = new Date(`${sessionDate}T${sessionEndTime}`);
      
      await fetch('/api/mentorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorshipId: mentorship.id,
          action: 'scheduleSession',
          title: sessionTitle,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          meetingLink: meetingLink || null
        })
      });
      setShowScheduleModal(false);
      setSessionTitle('');
      setSessionDate('');
      setSessionStartTime('');
      setSessionEndTime('');
      setMeetingLink('');
      window.location.reload();
    } catch (error) {
      console.error('Error scheduling session:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const submitReview = async () => {
    if (!rating) return;
    
    setIsUpdating(true);
    try {
      await fetch('/api/mentorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorshipId: mentorship.id,
          action: 'submitReview',
          rating,
          comment: reviewComment || null
        })
      });
      setShowReviewModal(false);
      setRating(5);
      setReviewComment('');
      window.location.reload();
    } catch (error) {
      console.error('Error submitting review:', error);
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
        {mentorship.sessions && mentorship.sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <MessageCircle size={16} />
            <span>{mentorship.sessions.filter((s: { status: string }) => s.status === 'COMPLETED').length} sessions completed</span>
            <span className="ml-2">{mentorship.sessions.filter((s: { status: string }) => s.status === 'SCHEDULED').length} sessions scheduled</span>
          </div>
        )}
        {/* Display upcoming sessions */}
        {mentorship.sessions && mentorship.sessions.filter((s: { status: string }) => s.status === 'SCHEDULED').length > 0 && (
          <div className="mt-3 p-3 bg-[var(--surface-subtle)] rounded-md">
            <p className="font-medium mb-1">Upcoming Session:</p>
            {mentorship.sessions
              .filter((s: { status: string }) => s.status === 'SCHEDULED')
              .slice(0, 1)
              .map((session: { id: string; title: string; startTime: string; meetingLink: string | null }) => (
                <div key={session.id} className="text-xs">
                  <p>{session.title}</p>
                  <p>{new Date(session.startTime).toLocaleString()}</p>
                  {session.meetingLink && <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[var(--text-link)]">Join Meeting</a>}
                </div>
              ))}
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
            {!isMentee && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="btn btn--ink"
              >
                <Calendar size={16} /> Schedule
              </button>
            )}
          </>
        )}

        {mentorship.status === 'COMPLETED' && isMentee && !mentorship.reviews?.some((r: { reviewerId: string }) => r.reviewerId === mentorship.menteeId) && (
          <button
            onClick={() => setShowReviewModal(true)}
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

      {/* Schedule Session Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-card)] p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Schedule Session</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Session Title</label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Weekly Check-in"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={sessionStartTime}
                    onChange={(e) => setSessionStartTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={sessionEndTime}
                    onChange={(e) => setSessionEndTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meeting Link (optional)</label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="https://zoom.us/..."
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="btn btn--ink"
                >
                  Cancel
                </button>
                <button
                  onClick={scheduleSession}
                  disabled={isUpdating || !sessionTitle || !sessionDate || !sessionStartTime || !sessionEndTime}
                  className="btn btn--sage"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-card)] p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Leave a Review</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 ${star <= rating ? 'text-yellow-500' : 'text-gray-400'}`}
                    >
                      <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Comment (optional)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                  placeholder="Share your experience..."
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="btn btn--ink"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  disabled={isUpdating || !rating}
                  className="btn btn--sage"
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}