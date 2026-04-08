export interface Influencer {
  id: string;
  name: string;
  niche: string;
  bio: string;
  avatarGradient: string;
  avatarInitial: string;
  referenceImages: ReferenceImage[];
  videos: Video[];
  createdAt: string;
}

export interface ReferenceImage {
  id: string;
  influencerId: string;
  thumbnailDataUrl: string;
  angle: ImageAngle;
  expression: ImageExpression;
  framing: ImageFraming;
  status: "pending" | "accepted" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

export interface Video {
  id: string;
  influencerId: string;
  prompt: string;
  template: VideoTemplate;
  duration: number;
  resolution: VideoResolution;
  status: VideoStatus;
  failureReason?: string;
  thumbnailGradient?: string;
  consistencyScore?: number;
  createdAt: string;
}

export type ImageAngle = "front" | "three-quarter" | "side" | "back";
export type ImageExpression = "neutral" | "smile" | "serious";
export type ImageFraming = "close-up" | "mid-shot" | "full-body";

export type VideoTemplate =
  | "grwm"
  | "day-in-my-life"
  | "outfit-check"
  | "product-review"
  | "dance"
  | "tutorial"
  | "freeform";

export type VideoResolution = "720p" | "1080p" | "4k";

export type VideoStatus =
  | "pending"
  | "generating_frame"
  | "animating"
  | "verifying"
  | "ready"
  | "failed";

export type WorkspaceView = "profile" | "references" | "create" | "analytics";

// ── Pipeline Types ──────────────────────────────────────────

export type PipelineStep = 1 | 2 | 3 | 4 | 5;

export type StepStatus =
  | "empty"
  | "generating"
  | "selecting"
  | "confirmed"
  | "failed";

export interface GeneratedFace {
  id: string;
  thumbnailDataUrl: string;
  fullDataUrl?: string;
}

export interface ReferenceGrid {
  id: string;
  thumbnailDataUrl: string;
  poses: GeneratedFace[];
}

export interface ReferenceVideo {
  id: string;
  thumbnailDataUrl: string;
  fileName: string;
  duration: number;
  objectUrl?: string;
}

export interface CompositeResult {
  id: string;
  thumbnailDataUrl: string;
}

export interface AnimationResult {
  id: string;
  thumbnailDataUrl: string;
  videoUrl?: string;
  consistencyScore: number;
}

export interface PipelineState {
  activeStep: PipelineStep;
  steps: {
    1: { status: StepStatus; options: GeneratedFace[]; selected: GeneratedFace | null };
    2: { status: StepStatus; grid: ReferenceGrid | null; confirmed: boolean };
    3: { status: StepStatus; video: ReferenceVideo | null };
    4: { status: StepStatus; options: CompositeResult[]; selected: CompositeResult | null };
    5: { status: StepStatus; result: AnimationResult | null; retryCount: number };
  };
}

export interface RosterFolder {
  id: string;
  name: string;
  influencerIds: string[];
  expanded: boolean;
}

export type RosterItem =
  | { type: "influencer"; id: string }
  | { type: "folder"; folderId: string };
