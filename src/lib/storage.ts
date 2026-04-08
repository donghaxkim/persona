import { get, set, del } from "idb-keyval";

export async function saveImageBlob(
  imageId: string,
  blob: Blob
): Promise<void> {
  await set(`img:${imageId}`, blob);
}

export async function getImageBlob(
  imageId: string
): Promise<Blob | undefined> {
  return get(`img:${imageId}`);
}

export async function deleteImageBlob(imageId: string): Promise<void> {
  await del(`img:${imageId}`);
}

export function resizeImage(
  file: File,
  maxWidth: number
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          resolve({ blob, dataUrl });
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
