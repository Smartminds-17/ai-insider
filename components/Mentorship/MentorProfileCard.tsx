'use client';

import { MentorProfile, User } from '@prisma/client';
import Link from 'next/link';

type MentorWithUser = MentorProfile & { user: User };

interface MentorProfileCardProps {
  mentor: MentorWithUser;
}

export default function MentorProfileCard({ mentor }: MentorProfileCardProps) {
  return (
    <article className="surface-card p-5 sm:p-6">
      <div className="flex items-start gap-4 mb-4">
        <img
          src={mentor.user.image || '/default-avatar.png'}
          alt={mentor.user.name || 'User'}
          className="w-14 h-14 rounded-full object-cover bg-gray-600"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{mentor.user.name || 'Unknown User'}</h3>
          <p className="text-sm text-[var(--text-dim)]">{mentor.bio}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {mentor.expertise.map((exp) => (
          <span key={exp} className="chip chip--ink">
            {exp}
          </span>
        ))}
      </div>
      <div className="mt-4">
        <Link href={`/mentors/${mentor.id}`} className="btn btn--route">
          View Profile
        </Link>
      </div>
    </article>
  );
}