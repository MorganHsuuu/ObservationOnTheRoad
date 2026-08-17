import { createBrowserClient } from "@/lib/supabase/browser";

export async function putFileWithProgress(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress: (ratio: number) => void,
  fallback?: { path: string; token: string },
) {
  try {
    await putWithXhr(signedUrl, file, contentType, onProgress);
  } catch {
    if (!fallback) throw new Error("upload failed");
    const supabase = createBrowserClient();
    if (!supabase) throw new Error("upload failed");
    const result = await supabase.storage
      .from("submissions")
      .uploadToSignedUrl(fallback.path, fallback.token, file, { contentType });
    if (result.error) throw new Error("upload failed");
    onProgress(1);
  }
}

function putWithXhr(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress: (ratio: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("upload failed"));
    };
    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.send(file);
  });
}
