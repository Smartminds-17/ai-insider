// Domain layer — plain types describing the business concepts.
// No dependency on Prisma, Next.js, or any external library.

export interface SyllabusTopic {
  title: string;
  order: number;
}

export interface Syllabus {
  title: string;
  topics: SyllabusTopic[];
}

export interface CandidateVideo {
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec: number;
  viewCount: number;
  publishedAt: string; // ISO date
}

export interface RankedVideo extends CandidateVideo {
  score: number;
}

export interface PathView {
  id: string;
  title: string;
  status: "GENERATING" | "READY" | "FAILED";
  topics: {
    id: string;
    title: string;
    order: number;
    videos: {
      id: string;
      youtubeVideoId: string;
      title: string;
      channelTitle: string;
      thumbnailUrl: string;
      durationSec: number;
      watched: boolean;
    }[];
  }[];
}
