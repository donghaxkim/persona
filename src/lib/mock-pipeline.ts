import { generateId } from "./utils";
import type {
  GeneratedFace,
  ReferenceGrid,
  ReferenceVideo,
  CompositeResult,
  AnimationResult,
} from "./types";
import { VIDEO_GRADIENTS } from "./constants";

export type PhaseCallback = (phase: string, progress: number) => void;

function randomDelay(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomGradientDataUrl(width = 200, height = 200): string {
  const hue1 = Math.floor(Math.random() * 360);
  const hue2 = (hue1 + 30 + Math.floor(Math.random() * 60)) % 360;
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) {
    // SSR fallback — return a 1x1 placeholder
    return "data:image/svg+xml;base64," + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="hsl(${hue1},50%,70%)"/>
      </svg>`
    );
  }
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${hue1}, 50%, 70%)`);
  gradient.addColorStop(1, `hsl(${hue2}, 60%, 60%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export async function simulateGenerateFaces(count = 8): Promise<GeneratedFace[]> {
  const delay = randomDelay(2000, 4000);
  await new Promise((r) => setTimeout(r, delay));

  // 5% failure rate
  if (Math.random() < 0.05) {
    throw new Error("Face generation failed — try again");
  }

  return Array.from({ length: count }, () => ({
    id: generateId(),
    thumbnailDataUrl: randomGradientDataUrl(200, 200),
  }));
}

export async function simulateGenerateGrid(face: GeneratedFace): Promise<ReferenceGrid> {
  const delay = randomDelay(3000, 5000);
  await new Promise((r) => setTimeout(r, delay));

  if (Math.random() < 0.05) {
    throw new Error("Grid generation failed — try again");
  }

  const poses: GeneratedFace[] = Array.from({ length: 9 }, () => ({
    id: generateId(),
    thumbnailDataUrl: randomGradientDataUrl(150, 150),
  }));

  return {
    id: generateId(),
    thumbnailDataUrl: face.thumbnailDataUrl,
    poses,
  };
}

export async function extractVideoKeyframe(file: File): Promise<ReferenceVideo> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.7);

      resolve({
        id: generateId(),
        thumbnailDataUrl,
        fileName: file.name,
        duration: Math.round(video.duration * 10) / 10,
        objectUrl,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read video file"));
    };

    video.src = objectUrl;
  });
}

export async function simulateComposite(
  _face: GeneratedFace,
  _keyframe: ReferenceVideo,
  onPhase?: PhaseCallback
): Promise<CompositeResult[]> {
  const delay = randomDelay(3000, 5000);
  await new Promise((r) => setTimeout(r, delay));

  if (Math.random() < 0.1) {
    throw new Error("Composite generation failed — try again");
  }

  const count = 2 + Math.floor(Math.random() * 2); // 2-3
  return Array.from({ length: count }, () => ({
    id: generateId(),
    thumbnailDataUrl: randomGradientDataUrl(320, 180),
  }));
}

export async function simulateAnimate(
  _composite: CompositeResult,
  _video: ReferenceVideo,
  onPhase?: PhaseCallback
): Promise<AnimationResult> {
  const delay = randomDelay(6000, 10000);
  await new Promise((r) => setTimeout(r, delay));

  if (Math.random() < 0.15) {
    throw new Error("Animation failed — consistency too low, retry recommended");
  }

  return {
    id: generateId(),
    thumbnailDataUrl: randomGradientDataUrl(320, 180),
    consistencyScore: Math.round((0.82 + Math.random() * 0.16) * 100) / 100,
  };
}
