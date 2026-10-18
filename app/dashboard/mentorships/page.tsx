import MentorshipDashboard from '@/components/Mentorship/MentorshipDashboard';

export default function MentorshipsPage() {
  return (
    <main className="mx-auto min-h-[calc(100dvh-64px)] w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="mb-9 border-b border-white/10 pb-7">
        <span className="legend-label legend-label--sage mb-3 block">Your learning network</span>
        <h1 className="font-display mb-2 text-3xl font-medium sm:text-4xl">Your Mentorships</h1>
        <p className="text-[var(--text-dim)]">Manage your mentorship relationships as a mentor or mentee.</p>
      </div>
      <MentorshipDashboard />
    </main>
  );
}
