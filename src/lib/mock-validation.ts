import type { ImageAngle, ImageExpression, ImageFraming } from "./types";
import { REJECTION_REASONS } from "./constants";

interface ValidationResult {
  status: "accepted" | "rejected";
  angle: ImageAngle;
  expression: ImageExpression;
  framing: ImageFraming;
  rejectionReason?: string;
}

const ANGLES: ImageAngle[] = ["front", "three-quarter", "side", "back"];
const EXPRESSIONS: ImageExpression[] = ["neutral", "smile", "serious"];
const FRAMINGS: ImageFraming[] = ["close-up", "mid-shot", "full-body"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function simulateValidation(): Promise<ValidationResult> {
  const delay = 800 + Math.random() * 1700; // 800–2500ms

  return new Promise((resolve) => {
    setTimeout(() => {
      const accepted = Math.random() < 0.85;

      if (accepted) {
        resolve({
          status: "accepted",
          angle: randomFrom(ANGLES),
          expression: randomFrom(EXPRESSIONS),
          framing: randomFrom(FRAMINGS),
        });
      } else {
        resolve({
          status: "rejected",
          angle: "front",
          expression: "neutral",
          framing: "close-up",
          rejectionReason: randomFrom(REJECTION_REASONS),
        });
      }
    }, delay);
  });
}
