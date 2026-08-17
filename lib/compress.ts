import imageCompression from "browser-image-compression";

export type CompressedPair = {
  full: File;
  thumb: File;
};

const FULL_MAX_SIDE = 1920;
const FULL_QUALITY = 0.84;
const THUMB_MAX_SIDE = 800;
const THUMB_QUALITY = 0.78;
const MAX_BYTES = 1_400_000;

export async function compressForUpload(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CompressedPair> {
  onProgress?.(10);
  try {
    const source = await decodeForUpload(file, FULL_MAX_SIDE);
    onProgress?.(30);
    let fullBlob = await canvasJpeg(source, FULL_MAX_SIDE, FULL_QUALITY);
    if (fullBlob.size > MAX_BYTES) {
      fullBlob = await canvasJpeg(source, FULL_MAX_SIDE, 0.76);
    }
    onProgress?.(72);
    const thumbBlob = await canvasJpeg(source, THUMB_MAX_SIDE, THUMB_QUALITY);
    closeSource(source);
    onProgress?.(80);
    return namedPair(fullBlob, thumbBlob);
  } catch {
    return compressWithLibrary(file, onProgress);
  }
}

async function compressWithLibrary(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CompressedPair> {
  const full = await imageCompression(file, {
    maxWidthOrHeight: FULL_MAX_SIDE,
    maxSizeMB: MAX_BYTES / (1024 * 1024),
    initialQuality: FULL_QUALITY,
    fileType: "image/jpeg",
    useWebWorker: true,
    onProgress: (percent) => onProgress?.(12 + Math.round(percent * 0.68)),
  });
  const thumbBlob = await canvasJpeg(await decodeImage(full), THUMB_MAX_SIDE, THUMB_QUALITY);
  return namedPair(full, thumbBlob);
}

function namedPair(full: Blob, thumb: Blob): CompressedPair {
  const stamp = Date.now();
  return {
    full: new File([full], `full-${stamp}.jpg`, { type: "image/jpeg" }),
    thumb: new File([thumb], `thumb-${stamp}.jpg`, { type: "image/jpeg" }),
  };
}

async function decodeForUpload(file: Blob, maxSide: number) {
  const full = await decodeImage(file);
  const long = Math.max(full.width, full.height);
  if (long <= maxSide) return full;
  const scale = maxSide / long;
  const width = Math.max(1, Math.round(full.width * scale));
  const height = Math.max(1, Math.round(full.height * scale));
  try {
    const sized = await createImageBitmap(full, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
    closeSource(full);
    return sized;
  } catch {
    return full;
  }
}

async function decodeImage(file: Blob) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return decodeWithElement(file);
  }
}

function decodeWithElement(file: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    image.src = url;
  });
}

function closeSource(source: ImageBitmap | HTMLImageElement) {
  if ("close" in source) source.close();
}

async function canvasJpeg(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number,
) {
  const width = source.width;
  const height = source.height;
  const long = Math.max(width, height);
  const scale = long > maxSide ? maxSide / long : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) throw new Error("jpeg");
  return blob;
}
