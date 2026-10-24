export interface Mentorship {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
  mentee: {
    id: string;
    name: string | null;
    image: string | null;
  };
  mentor: {
    id: string;
    name: string | null;
    image: string | null;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  };
  sessions: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    meetingLink: string | null;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  }[];
  reviews: {
    id: string;
    reviewerId: string;
  }[];
  createdAt: string;
  menteeId: string;
}