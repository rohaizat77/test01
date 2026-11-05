export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let message = "Something went wrong. Please try again.";
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(res.status, message);
}

function networkError(): never {
  throw new ApiError(0, "Can't reach CikguAI. Check your connection and try again.");
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    credentials: "same-origin",
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  }).catch(networkError);
  return handle<T>(res);
}

export async function upload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(path, { method: "POST", body: form, credentials: "same-origin" }).catch(networkError);
  return handle<T>(res);
}

// Streams a plain-text response, calling onChunk with each piece as it arrives.
export async function stream(path: string, json: unknown, onChunk: (text: string) => void): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  }).catch(networkError);
  if (!res.ok || !res.body) await handle(res);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

// Resizes a photo in the browser before upload (max 1280 px, JPEG) to save bandwidth on mobile data.
export async function shrinkImage(file: File, max = 1280): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new ApiError(415, "Please choose an image file.");
  if (file.size > 20 * 1024 * 1024) throw new ApiError(413, "That photo is over 20 MB. Please choose a smaller one.");
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (blob) return blob;
  } catch {
    /* Some browsers can't decode HEIC; fall back to the original if it's small enough. */
  }
  if (file.size <= 6 * 1024 * 1024) return file;
  throw new ApiError(415, "We couldn't read that photo. Try a JPEG or PNG.");
}

export const fmt = {
  pct: (p: number | null | undefined) => (p === null || p === undefined ? "–" : `${Math.round(p * 100)}%`),
  num: (n: number, dp = 0) => n.toLocaleString("en-MY", { maximumFractionDigits: dp }),
  date: (iso: string, lang: "en" | "ms" = "en") =>
    new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(lang === "ms" ? "ms-MY" : "en-MY", { day: "numeric", month: "short" }),
};

export function newSessionId() {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Streams a plain-text response to a multipart POST (used by the tutor, which may include a photo).
export async function streamForm(path: string, form: FormData, onChunk: (text: string) => void): Promise<void> {
  const res = await fetch(path, { method: "POST", body: form, credentials: "same-origin" }).catch(networkError);
  if (!res.ok || !res.body) await handle(res);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
