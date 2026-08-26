export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageValidationError = "type" | "size" | null;

export function validateImageFile(file: File): ImageValidationError {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) return "type";
  if (file.size > MAX_IMAGE_BYTES) return "size";
  return null;
}

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });

/**
 * Downscales to a square-ish max edge and re-encodes as WebP so public
 * profiles stay fast on mobile. Falls back to the original file on failure.
 */
export async function optimizeImage(file: File, maxEdge = 640, quality = 0.86): Promise<Blob> {
  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    return blob && blob.size > 0 ? blob : file;
  } catch {
    return file;
  }
}
