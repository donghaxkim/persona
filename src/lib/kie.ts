// src/lib/kie.ts

const KIE_BASE = "https://api.kie.ai";

function getApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error("KIE_API_KEY environment variable is not set");
  return key;
}

function getWebhookUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/api/webhooks/kie`;
}

async function kieRequest<T>(path: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(`${KIE_BASE}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Kie.ai API error (${res.status}): ${text}`);
  }

  return res.json();
}

// --- Flux Kontext (synchronous image generation) ---

interface FluxKontextResponse {
  imageUrl: string;
  taskId: string;
}

export async function generateImage(prompt: string, options?: {
  inputImage?: string;
  aspectRatio?: string;
}): Promise<FluxKontextResponse> {
  return kieRequest<FluxKontextResponse>("/api/v1/flux/kontext/generate", {
    prompt,
    inputImage: options?.inputImage,
    aspectRatio: options?.aspectRatio || "1:1",
  });
}

// --- Video Generation (async with callback) ---

interface CreateTaskResponse {
  taskId: string;
  message: string;
}

export async function createVideoTask(
  model: string,
  input: Record<string, any>
): Promise<CreateTaskResponse> {
  return kieRequest<CreateTaskResponse>("/api/v1/jobs/createTask", {
    model,
    callBackUrl: getWebhookUrl(),
    input,
  });
}

// --- Task Status Check (polling fallback) ---

interface TaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    successFlag: number; // 0=processing, 1=completed, 2=create failed, 3=generate failed
    response?: {
      resultImageUrl?: string;
      originImageUrl?: string;
    };
    info?: {
      resultUrls?: string; // JSON string array of URLs
    };
  };
}

export async function checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const res = await fetch(
    `${KIE_BASE}/api/v1/flux/kontext/record-info?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: { "Authorization": `Bearer ${getApiKey()}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Kie.ai status check failed (${res.status})`);
  }

  return res.json();
}

// --- Pipeline Step Helpers ---

// Step 1: Generate face from prompt + reference
export async function generateFace(prompt: string, referenceImageUrl?: string) {
  return generateImage(
    prompt,
    referenceImageUrl ? { inputImage: referenceImageUrl, aspectRatio: "1:1" } : { aspectRatio: "1:1" }
  );
}

// Step 2: Generate pose grid from selected face
export async function generatePoseGrid(faceImageUrl: string, posePrompt: string) {
  return generateImage(posePrompt, {
    inputImage: faceImageUrl,
    aspectRatio: "1:1",
  });
}

// Step 4: Generate composite (face on video keyframe)
export async function generateComposite(faceImageUrl: string, keyframeUrl: string, prompt: string) {
  return generateImage(prompt, {
    inputImage: keyframeUrl,
    aspectRatio: "16:9",
  });
}

// Step 5: Animate (image-to-video)
export async function animateComposite(compositeImageUrl: string, prompt: string, duration: "5" | "10" = "5") {
  return createVideoTask("kling/v2-5-turbo-image-to-video-pro", {
    prompt,
    image_url: compositeImageUrl,
    duration,
  });
}

// --- Webhook HMAC Verification ---

export function verifyWebhookSignature(
  taskId: string,
  timestamp: string,
  receivedSignature: string
): boolean {
  const webhookKey = process.env.KIE_WEBHOOK_SECRET;
  if (!webhookKey) return true; // Skip verification if no key configured (dev mode)

  const crypto = require("crypto");
  const message = `${taskId}.${timestamp}`;
  const computed = crypto
    .createHmac("sha256", webhookKey)
    .update(message)
    .digest("base64");

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(receivedSignature)
    );
  } catch {
    return false;
  }
}
