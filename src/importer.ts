/** File inspection: metadata, cover extraction, fingerprinting and source resolution. Copyright (c) 2026 Develofer2. MIT License. */
import type { Source, Track } from "./models"
import { MAX_AUDIO_BYTES, cleanText, isSafeImage } from "./security"
import { normalizeMetadataList } from "./metadata"
export const audioExtensions =
  /\.(mp3|wav|flac|ogg|oga|m4a|aac|opus|aiff|aif|webm|mp4)$/i
interface InspectedFile {
  track: Track
  source: Source
}
export class SourceAccessError extends Error {
  constructor(
    message: string,
    public reason: "permission-required" | "missing",
  ) {
    super(message)
    this.name = "SourceAccessError"
  }
}
export async function inspectFile(
  file: File,
  handle?: FileSystemFileHandle,
  copy = false,
): Promise<InspectedFile> {
  if (!audioExtensions.test(file.name) && !file.type.startsWith("audio/"))
    throw new Error(`${file.name}: not a supported audio file.`)
  if (!file.size) throw new Error(`${file.name}: this file is empty.`)
  if (file.size > MAX_AUDIO_BYTES)
    throw new Error(`${file.name}: files over 2 GB are not supported.`)
  // Bounded memory fingerprint. Exact full hashes for small files; sampled identity for large files.
  const bytes =
    file.size <= 16 * 1024 * 1024
      ? await file.arrayBuffer()
      : await new Blob([
          file.slice(0, 1024 * 1024),
          file.slice(-1024 * 1024),
        ]).arrayBuffer()
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  const fingerprint = `${file.size}:${Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")}`
  let title = file.name.replace(/\.[^.]+$/, "").replace(/_/g, " ")
  let artist = "Unknown artist",
    album = "Unknown album",
    duration = 0,
    artwork: Blob | undefined,
    genres: string[] = []
  try {
    const { parseBlob } = await import("music-metadata")
    const metadata = await parseBlob(file, {
      duration: true,
      skipCovers: false,
    })
    title = cleanText(metadata.common.title || "") || title
    artist = cleanText(metadata.common.artist || "") || artist
    album = cleanText(metadata.common.album || "") || album
    duration = metadata.format.duration || 0
    genres = normalizeMetadataList(metadata.common.genre)
    const picture = metadata.common.picture?.[0]
    if (picture) {
      const cover = new Blob([new Uint8Array(picture.data)], {
        type: picture.format,
      })
      if (isSafeImage(cover)) artwork = cover
    }
  } catch {
    /* Files without tags still use browser playback and filename metadata. */
  }
  const id = crypto.randomUUID()
  return {
    track: {
      id,
      title,
      artist,
      album,
      filename: file.name,
      duration,
      size: file.size,
      fingerprint,
      added: Date.now(),
      favorite: false,
      plays: 0,
      access: handle && !copy ? "reference" : "copy",
      ...(genres.length ? { genres } : {}),
    },
    source: {
      id,
      ...(handle ? { handle } : {}),
      ...(!handle || copy ? { blob: file } : {}),
      artwork,
    },
  }
}
export async function resolveSource(
  source: Source,
  request = false,
): Promise<Blob> {
  if (source.blob?.size) return source.blob
  if (source.handle) {
    const handle = source.handle as FileSystemFileHandle & {
      queryPermission(o: { mode: string }): Promise<string>
      requestPermission(o: { mode: string }): Promise<string>
    }
    let permission = await handle.queryPermission({ mode: "read" })
    if (permission !== "granted" && request)
      permission = await handle.requestPermission({ mode: "read" })
    if (permission !== "granted")
      throw new SourceAccessError(
        "File access is needed. Use Relink or Grant access to reconnect this track.",
        "permission-required",
      )
    return handle.getFile()
  }
  throw new SourceAccessError(
    "The audio file is unavailable. Relink this track to keep its playlists and history.",
    "missing",
  )
}
