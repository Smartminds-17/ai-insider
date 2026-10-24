import MentorDirectory from '@/components/Mentorship/MentorDirectory';
import FeatureStatusBanner from '@/components/ui/FeatureStatusBanner';

export default function MentorsPage() {
  return (
    <main className="mx-auto min-h-[calc(100dvh-64px)] w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-16">
      <FeatureStatusBanner
        status="maintenance"
        message="The mentorship program is currently under maintenance. We'll be back soon!"
      />
      <div className="mb-9 border-b border-white/10 pb-7">
        <span className="legend-label legend-label--sage mb-3 block">Guidance for your next step</span>
        <h1 className="font-display mb-2 text-3xl font-medium sm:text-4xl">Find a Mentor</h1>
        <p className="max-w-2xl text-[var(--text-dim)] sm:text-lg">Connect with experienced mentors to guide your learning journey.</p>
      </div>
      <MentorDirectory />
    </main>
  );
}