import { MentorProfileForm } from "@/components/Mentorship/MentorProfileForm";

export default function CreateMentorProfilePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Become a Mentor</h1>
      <p className="text-lg text-gray-600 mb-8">
        Share your expertise and help others grow in their careers. Fill out the form below to create your mentor profile.
      </p>
      <MentorProfileForm />
    </div>
  );
}