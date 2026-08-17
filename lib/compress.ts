import imageCompression from "browser-image-compression";

export type CompressedPair = {
  full: File;
  thumb: File;
};

export async function compressForUpload(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CompressedPair> {
  const full = await imageCompression(file, {
    maxWidthOrHeight: 1920,
    maxSizeMB: 0.9,
    initialQuality: 0.84,
    fileType: "image/jpeg",
    useWebWorker: true,
    onProgress: (p) => onProgress?.(Math.round(p * 0.7)),
  });

  const thumb = await imageCompression(file, {
    maxWidthOrHeight: 960,
    maxSizeMB: 0.22,
    initialQuality: 0.86,
    fileType: "image/webp",
    useWebWorker: true,
    onProgress: (p) => onProgress?.(70 + Math.round(p * 0.2)),
  });

  const stamp = Date.now();
  return {
    full: new File([full], `full-${stamp}.jpg`, { type: "image/jpeg" }),
    thumb: new File([thumb], `thumb-${stamp}.webp`, { type: "image/webp" }),
  };
}
