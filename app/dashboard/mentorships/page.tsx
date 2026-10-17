import MentorshipDashboard from '@/components/Mentorship/MentorshipDashboard';

export default function MentorshipsPage() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Mentorships</h1>
        <p className="text-gray-400">Manage your mentorship relationships as a mentor or mentee</p>
      </div>
      <MentorshipDashboard />
    </div>
  );
}