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

export type VideoSource = "YOUTUBE" | "VIMEO" | "OTHER";

export type GoalStatus = "GENERATING" | "READY" | "FAILED";
export type PathStatus = "GENERATING" | "READY" | "FAILED";

export interface GoalSummary {
  id: string;
  title: string;
  prompt: string;
  status: GoalStatus;
  createdAt: string; // ISO date
  pathId: string | null;
  pathStatus: PathStatus | null;
  topicCount: number;
  watchedCount: number;
  totalVideos: number;
}

export interface PathView {
  id: string;
  goalId: string;
  title: string;
  prompt: string;
  status: PathStatus;
  topics: {
    id: string;
    title: string;
    order: number;
    selectedVideoId: string | null;
    videos: {
      id: string;
      youtubeVideoId: string;
      title: string;
      channelTitle: string;
      thumbnailUrl: string;
      durationSec: number;
      watched: boolean;
      selected: boolean;
      source: VideoSource;
    }[];
  }[];
}

// Lighter-weight shape for a paths list (history) view — no nested topics/videos.
export interface PathSummary {
  id: string;
  title: string;
  prompt: string;
  status: PathStatus;
  createdAt: string; // ISO date
  totalVideos: number;
  watchedVideos: number;
}