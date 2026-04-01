import { authFetch } from "./queryClient";

export interface UploadResult {
  url: string;
  filename: string;
  type: string;
  size: number;
  storageKey?: string | null;
  driveUrl?: string | null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const b64 = await fileToBase64(file);
  const res = await authFetch("/api/upload-base64", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: b64,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errData.error || `Upload failed (${res.status})`);
  }
  return res.json();
}
