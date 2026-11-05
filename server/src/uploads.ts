// Private image storage for tutor photos and photographed answers.
// Files live outside the web root and are only served through an access-checked route.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { MultipartFile } from "@fastify/multipart";
import { db, UPLOAD_DIR } from "./db.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export class UploadError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Validates type, re-encodes (strips EXIF/GPS, fixes rotation), caps the size for the AI, and saves it.
export async function saveImage(file: MultipartFile): Promise<{ name: string; base64: string }> {
  if (!ALLOWED.has(file.mimetype)) throw new UploadError(415, "Please upload a JPEG, PNG, WebP or HEIC photo.");
  const raw = await file.toBuffer();
  let jpeg: Buffer;
  try {
    jpeg = await sharp(raw, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    throw new UploadError(422, "That file doesn't look like a valid image. Try another photo.");
  }
  const name = `${crypto.randomBytes(16).toString("hex")}.jpg`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), jpeg, { mode: 0o640 });
  return { name, base64: jpeg.toString("base64") };
}

export function readImage(name: string): Buffer | null {
  if (!/^[a-f0-9]{32}\.jpg$/.test(name)) return null;
  try {
    return fs.readFileSync(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

// Remove files whose message or submission no longer exists (e.g. after a demo class expires).
export function cleanupOrphanUploads() {
  const used = new Set<string>();
  for (const r of db.prepare("SELECT image FROM tutor_messages WHERE image IS NOT NULL UNION SELECT image FROM submissions WHERE image IS NOT NULL").all() as { image: string }[]) {
    used.add(r.image);
  }
  const cutoff = Date.now() - 3600_000;
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    if (!f.endsWith(".jpg") || used.has(f)) continue;
    const full = path.join(UPLOAD_DIR, f);
    if (fs.statSync(full).mtimeMs < cutoff) fs.rmSync(full, { force: true });
  }
}
