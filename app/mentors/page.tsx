import MentorDirectory from '@/components/Mentorship/MentorDirectory';

export default function MentorsPage() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Find a Mentor</h1>
        <p className="text-gray-400 text-lg">Connect with experienced mentors to guide your learning journey</p>
      </div>
      <MentorDirectory />
    </div>
  );
}