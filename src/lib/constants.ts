import type {
  ImageAngle,
  ImageExpression,
  ImageFraming,
  VideoTemplate,
} from "./types";

export const ANGLES: { value: ImageAngle; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "three-quarter", label: "¾ View" },
  { value: "side", label: "Side" },
  { value: "back", label: "Back" },
];

export const EXPRESSIONS: { value: ImageExpression; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "smile", label: "Smile" },
  { value: "serious", label: "Serious" },
];

export const FRAMINGS: { value: ImageFraming; label: string }[] = [
  { value: "close-up", label: "Close-up" },
  { value: "mid-shot", label: "Mid-shot" },
  { value: "full-body", label: "Full body" },
];

export const TEMPLATES: { value: VideoTemplate; label: string }[] = [
  { value: "grwm", label: "GRWM" },
  { value: "day-in-my-life", label: "Day in My Life" },
  { value: "outfit-check", label: "Outfit Check" },
  { value: "product-review", label: "Product Review" },
  { value: "dance", label: "Dance" },
  { value: "tutorial", label: "Tutorial" },
  { value: "freeform", label: "Freeform" },
];

export const TEMPLATE_PLACEHOLDERS: Record<VideoTemplate, string> = {
  grwm: "Describe the setting, products, morning routine vibe...",
  "day-in-my-life": "Describe the activities, locations, mood of the day...",
  "outfit-check": "Describe the outfit, setting, poses, vibe...",
  "product-review": "Describe the product, setting, talking points...",
  dance: "Describe the music style, energy level, environment...",
  tutorial: "Describe what you're teaching, the setup, steps...",
  freeform: "Describe the scene, action, and setting...",
};

export const REJECTION_REASONS = [
  "Face not clearly visible",
  "Image too blurry",
  "Multiple people detected",
  "Resolution too low",
  "Heavy filter detected",
];

export const GENERATION_STAGES = [
  { label: "Analyzing references...", targetProgress: 20, durationMs: 1500 },
  { label: "Generating keyframes...", targetProgress: 55, durationMs: 3000 },
  { label: "Animating sequence...", targetProgress: 85, durationMs: 4000 },
  { label: "Verifying consistency...", targetProgress: 100, durationMs: 1500 },
];

export const FAILURE_REASONS = [
  "Consistency check failed — character drifted too far from reference",
  "Generation timed out — try a simpler scene description",
];

export const NICHE_OPTIONS = [
  "Fashion",
  "Tech",
  "Fitness",
  "Beauty",
  "Travel",
  "Food",
  "Lifestyle",
  "Gaming",
  "Music",
  "Education",
];

export const VIDEO_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
];
