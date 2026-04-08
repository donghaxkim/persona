import type { Influencer, ImageAngle, ImageExpression, ImageFraming, VideoTemplate } from "./types";
import { VIDEO_GRADIENTS } from "./constants";

// Generate a tiny colored rectangle as a base64 thumbnail
function makeThumbnail(hue: number, saturation = 40, lightness = 70): string {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;

  // Soft gradient background
  const grad = ctx.createLinearGradient(0, 0, 200, 200);
  grad.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
  grad.addColorStop(1, `hsl(${hue + 30}, ${saturation + 10}%, ${lightness - 10}%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 200, 200);

  // Simple face silhouette (circle + shoulders)
  ctx.fillStyle = `hsla(${hue + 15}, 20%, ${lightness - 25}%, 0.3)`;
  ctx.beginPath();
  ctx.arc(100, 80, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(100, 170, 60, 40, 0, Math.PI, 0);
  ctx.fill();

  return canvas.toDataURL("image/jpeg", 0.6);
}

function makeRef(
  id: string,
  influencerId: string,
  angle: ImageAngle,
  expression: ImageExpression,
  framing: ImageFraming,
  hue: number
) {
  return {
    id,
    influencerId,
    thumbnailDataUrl: makeThumbnail(hue + Math.random() * 40),
    angle,
    expression,
    framing,
    status: "accepted" as const,
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
  };
}

function makeVideo(
  id: string,
  influencerId: string,
  prompt: string,
  template: VideoTemplate,
  status: "ready" | "failed",
  gradientIndex: number
) {
  return {
    id,
    influencerId,
    prompt,
    template,
    duration: [5, 10, 15, 30][Math.floor(Math.random() * 4)],
    resolution: "1080p" as const,
    status,
    failureReason: status === "failed" ? "Consistency check failed — character drifted too far from reference" : undefined,
    thumbnailGradient: VIDEO_GRADIENTS[gradientIndex % VIDEO_GRADIENTS.length],
    consistencyScore: status === "ready" ? Math.round((0.84 + Math.random() * 0.14) * 100) / 100 : undefined,
    createdAt: new Date(Date.now() - Math.random() * 86400000 * 14).toISOString(),
  };
}

export function generateSeedData(): Influencer[] {
  return [
    {
      id: "seed-aria",
      name: "Aria Nova",
      niche: "Fashion",
      bio: "Digital fashion muse ✨ Curating looks from Paris to Tokyo. Sustainable style advocate.",
      avatarGradient: "linear-gradient(135deg, hsl(340, 50%, 65%) 0%, hsl(370, 60%, 55%) 100%)",
      avatarInitial: "A",
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      referenceImages: [
        makeRef("ref-a1", "seed-aria", "front", "neutral", "close-up", 340),
        makeRef("ref-a2", "seed-aria", "front", "smile", "mid-shot", 340),
        makeRef("ref-a3", "seed-aria", "three-quarter", "neutral", "close-up", 340),
        makeRef("ref-a4", "seed-aria", "three-quarter", "smile", "mid-shot", 340),
        makeRef("ref-a5", "seed-aria", "side", "neutral", "close-up", 340),
        makeRef("ref-a6", "seed-aria", "side", "serious", "full-body", 340),
        makeRef("ref-a7", "seed-aria", "front", "serious", "full-body", 340),
        makeRef("ref-a8", "seed-aria", "back", "neutral", "full-body", 340),
        makeRef("ref-a9", "seed-aria", "three-quarter", "serious", "close-up", 340),
        makeRef("ref-a10", "seed-aria", "front", "smile", "full-body", 340),
        makeRef("ref-a11", "seed-aria", "side", "smile", "mid-shot", 340),
        makeRef("ref-a12", "seed-aria", "three-quarter", "neutral", "full-body", 340),
      ],
      videos: [
        makeVideo("vid-a1", "seed-aria", "Morning routine at a sunlit vanity, applying blush, warm golden hour light through sheer curtains", "grwm", "ready", 0),
        makeVideo("vid-a2", "seed-aria", "Walking through a Parisian street market in a cream trench coat, browsing vintage jewelry", "day-in-my-life", "ready", 1),
        makeVideo("vid-a3", "seed-aria", "Standing in a minimalist loft, showing off three layered necklaces — close-up transitions between each", "outfit-check", "ready", 5),
        makeVideo("vid-a4", "seed-aria", "Casual dance in a rooftop garden at sunset, flowing dress, upbeat energy", "dance", "ready", 2),
        makeVideo("vid-a5", "seed-aria", "Reviewing a new skincare serum at a marble bathroom counter, demonstrating application", "product-review", "failed", 3),
      ],
    },
    {
      id: "seed-kai",
      name: "Kai Chen",
      niche: "Tech",
      bio: "Tech reviewer & desk setup enthusiast. Mechanical keyboards are a personality trait.",
      avatarGradient: "linear-gradient(135deg, hsl(210, 45%, 60%) 0%, hsl(240, 55%, 50%) 100%)",
      avatarInitial: "K",
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      referenceImages: [
        makeRef("ref-k1", "seed-kai", "front", "neutral", "close-up", 210),
        makeRef("ref-k2", "seed-kai", "front", "smile", "mid-shot", 210),
        makeRef("ref-k3", "seed-kai", "three-quarter", "neutral", "close-up", 210),
        makeRef("ref-k4", "seed-kai", "three-quarter", "serious", "mid-shot", 210),
        makeRef("ref-k5", "seed-kai", "side", "neutral", "close-up", 210),
        makeRef("ref-k6", "seed-kai", "front", "serious", "full-body", 210),
        makeRef("ref-k7", "seed-kai", "back", "neutral", "full-body", 210),
      ],
      videos: [
        makeVideo("vid-k1", "seed-kai", "Unboxing a new mechanical keyboard at a clean desk setup, close-up of switches and typing test", "product-review", "ready", 4),
        makeVideo("vid-k2", "seed-kai", "Day in the life: morning coffee, coding session, afternoon gym, evening gaming setup", "day-in-my-life", "ready", 6),
        makeVideo("vid-k3", "seed-kai", "Tutorial: setting up a minimal desk workspace — cable management, monitor positioning, lighting", "tutorial", "ready", 7),
      ],
    },
    {
      id: "seed-luna",
      name: "Luna Park",
      niche: "Fitness",
      bio: "Fitness coach & wellness creator. Morning workouts, meal preps, and motivation.",
      avatarGradient: "linear-gradient(135deg, hsl(140, 40%, 60%) 0%, hsl(170, 50%, 50%) 100%)",
      avatarInitial: "L",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      referenceImages: [
        makeRef("ref-l1", "seed-luna", "front", "smile", "close-up", 140),
        makeRef("ref-l2", "seed-luna", "front", "neutral", "full-body", 140),
        makeRef("ref-l3", "seed-luna", "three-quarter", "smile", "mid-shot", 140),
        makeRef("ref-l4", "seed-luna", "side", "serious", "full-body", 140),
      ],
      videos: [],
    },
  ];
}
