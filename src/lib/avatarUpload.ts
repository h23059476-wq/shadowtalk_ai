/**
 * Avatar upload — converts the image to a data URL stored in the profile.
 *
 * Previously this tried to upload to Firebase Storage bucket "avatars",
 * which required bucket configuration + storage rules. Many deployments
 * don't have this set up. Instead, we now convert the image to a
 * compressed data URL (max 200px, JPEG quality 0.8) and store it
 * directly in the profiles table as `avatar_url`.
 *
 * This works everywhere — no Storage bucket needed.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const OUTPUT_SIZE = 200; // px — square crop
const OUTPUT_QUALITY = 0.8;

export async function uploadProfileAvatar(
  userId: string,
  file: File,
): Promise<{ publicUrl: string } | { error: string }> {
  if (!ALLOWED.includes(file.type)) {
    return { error: "Use JPEG, PNG, WebP, or GIF" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be under 5 MB" };
  }

  try {
    // Read the file as a data URL
    const dataUrl = await readFileAsDataUrl(file);

    // Resize/compress the image to a 200x200 JPEG data URL
    const compressed = await resizeImage(dataUrl, OUTPUT_SIZE, OUTPUT_QUALITY);

    return { publicUrl: compressed };
  } catch (err: any) {
    return { error: err?.message || "Failed to process image" };
  }
}

/** Read a File as a data URL. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize an image data URL to a square crop of `size` px and return
 * a compressed JPEG data URL.
 */
function resizeImage(dataUrl: string, size: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      // Center-crop to square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}
