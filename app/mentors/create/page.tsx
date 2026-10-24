import { MentorProfileForm } from "@/components/Mentorship/MentorProfileForm";

export default function CreateMentorProfilePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Become a Mentor</h1>
      <p className="mb-8">
        Fill out your profile to start mentoring others.
      </p>
      <MentorProfileForm />
    </div>
  );
}