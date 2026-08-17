import imageCompression from "browser-image-compression";

export type CompressedPair = {
  full: File;
  thumb: File;
};

export async function compressForUpload(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CompressedPair> {
  onProgress?.(12);
  const full = await imageCompression(file, {
    maxWidthOrHeight: 1440,
    maxSizeMB: 0.42,
    initialQuality: 0.72,
    fileType: "image/jpeg",
    useWebWorker: true,
    onProgress: (percent) => onProgress?.(12 + Math.round(percent * 0.55)),
  });

  onProgress?.(70);
  const thumb = await imageCompression(full, {
    maxWidthOrHeight: 640,
    maxSizeMB: 0.08,
    initialQuality: 0.7,
    fileType: "image/jpeg",
    useWebWorker: false,
    onProgress: (percent) => onProgress?.(70 + Math.round(percent * 0.1)),
  });

  const stamp = Date.now();
  return {
    full: new File([full], `full-${stamp}.jpg`, { type: "image/jpeg" }),
    thumb: new File([thumb], `thumb-${stamp}.jpg`, { type: "image/jpeg" }),
  };
}
