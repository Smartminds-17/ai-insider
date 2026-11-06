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
  /** YouTube channel id, when the source response provides it. */
  channelId?: string | null;
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
  community?: { id: string; name: string } | null;
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
      /** Channel metadata for the "creators" surfaces; null until backfilled. */
      channelId: string | null;
      channelHandle: string | null;
      channelAvatarUrl: string | null;
      thumbnailUrl: string;
      durationSec: number;
      watched: boolean;
      watchedSeconds: number;
      lastPositionSec: number;
      farthestPositionSec: number;
      /** ISO timestamp of the last progress update, used to pick "continue watching". */
      lastWatchedAt: string | null;
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
  /** Canonical time-based progress, 0–100. See src/domain/progress.ts. */
  progressPercent: number;
  /** ISO timestamp of the most recent progress update, if the user started. */
  lastWatchedAt: string | null;
  /** YouTube id of the lesson to resume, when a lesson is in progress. */
  resumeVideoId: string | null;
  resumeVideoTitle: string | null;
  resumeThumbnailUrl: string | null;
  /** Seconds left in the resume lesson, for "12 min left" copy. */
  resumeRemainingSec: number | null;
  topicCount: number;
  totalDurationSec: number;
  /** First lesson thumbnail, used as the route's cover art. */
  coverThumbnailUrl: string | null;
}
