/** Copyright (c) 2026 Develofer2. MIT License. */
/**
 * Input-hardening helpers.
 * Everything that enters the app from outside (files, backups, user text)
 * passes through these checks before it is stored or rendered.
 */

/** Largest audio file accepted for import (2 GiB). */
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024 * 1024
/** Largest cover image accepted (5 MiB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
/** Raster formats allowed for covers. SVG is excluded on purpose (scriptable). */
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
])

/** Removes control and bidi-override characters, trims, and caps length. */
export function cleanText(value: string, max = 1000): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim()
    .slice(0, max)
}

/** True when the blob is a small raster image of an allowed type. */
export function isSafeImage(blob: Blob): boolean {
  return IMAGE_TYPES.has(blob.type) && blob.size > 0 && blob.size <= MAX_IMAGE_BYTES
}
