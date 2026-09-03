// Domain layer — plain types describing the business concepts.
// No dependency on Prisma, Next.js, or any external library.

export type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type PathStatus = "GENERATING" | "READY" | "FAILED";
export type VideoSource = "GENERATED" | "INSPIRATION";

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

export interface PathVideoView {
  id: string;
  youtubeVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSec: number;
  watched: boolean;
  selected: boolean;
  source: VideoSource;
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
    videos: PathVideoView[];
  }[];
}

export interface GoalSummary {
  id: string;
  title: string;
  prompt: string;
  status: GoalStatus;
  createdAt: string;
  pathId: string | null;
  pathStatus: PathStatus | null;
  topicCount: number;
  watchedCount: number;
  totalVideos: number;
}
