/** Metadata backup export, validation and merge-restore. Copyright (c) 2026 Develofer2. MIT License. */
import { database } from "./storage"
import {
  canvasModeIds,
  defaults,
  type Track,
  type Playlist,
  type ListeningEvent,
  type Preferences,
  type RecommendationProfile,
  type RecommendationFeedback,
  type RecommendationSettings,
  recommendationPurposeIds,
} from "./models"
import { validTheme } from "./themes"
import { cleanText } from "./security"
import { normalizeMetadataList } from "./metadata"
import { defaultRecommendationSettings } from "./storage"
export type Backup = {
  version: 1 | 2
  tracks: Track[]
  playlists: Playlist[]
  events: ListeningEvent[]
  preferences: Preferences
  recommendationProfiles?: RecommendationProfile[]
  recommendationFeedback?: RecommendationFeedback[]
  recommendationSettings?: RecommendationSettings
}
export async function createBackup(): Promise<Backup> {
  const db = await database()
  return {
    version: 2,
    tracks: await db.getAll("tracks"),
    playlists: await db.getAll("playlists"),
    events: await db.getAll("events"),
    preferences:
      (await db.get("settings", "preferences")) as Preferences || defaults,
    recommendationProfiles: await db.getAll("recommendationProfiles"),
    recommendationFeedback: await db.getAll("recommendationFeedback"),
    recommendationSettings:
      (await db.get("settings", "recommendations")) as RecommendationSettings ||
      defaultRecommendationSettings,
  }
}
const str = (s: unknown, max = 1000): s is string =>
  typeof s === "string" && s.length <= max
const num = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0
export function validateBackup(value: unknown): Backup {
  const b = value as Backup
  if (
    !b ||
    ![1, 2].includes(b.version) ||
    !Array.isArray(b.tracks) ||
    !Array.isArray(b.playlists) ||
    !Array.isArray(b.events) ||
    b.tracks.length > 50000 ||
    b.playlists.length > 10000 ||
    b.events.length > 500000
  )
    throw new Error("Invalid or unsupported AURA backup.")
  for (const t of b.tracks)
    if (
      !t ||
      !str(t.id, 100) ||
      !str(t.title) ||
      !str(t.artist) ||
      !str(t.album) ||
      !str(t.filename) ||
      !str(t.fingerprint, 200) ||
      !num(t.duration) ||
      !num(t.size) ||
      !num(t.added) ||
      !num(t.plays) ||
      typeof t.favorite !== "boolean"
    )
      throw new Error("Backup contains invalid track metadata.")
    else if (
      (t.genres !== undefined &&
        (!Array.isArray(t.genres) ||
          t.genres.length > 24 ||
          !t.genres.every((value) => str(value, 80)))) ||
      (t.moodTags !== undefined &&
        (!Array.isArray(t.moodTags) ||
          t.moodTags.length > 24 ||
          !t.moodTags.every((value) => str(value, 80))))
    )
      throw new Error("Backup contains invalid track tags.")
  if (new Set(b.tracks.map((t) => t.id)).size !== b.tracks.length)
    throw new Error("Backup contains duplicate track identifiers.")
  for (const p of b.playlists)
    if (
      !p ||
      !str(p.id, 100) ||
      !str(p.name, 100) ||
      !str(p.description, 2000) ||
      !num(p.created) ||
      !Array.isArray(p.tracks) ||
      p.tracks.length > 50000 ||
      !p.tracks.every((t) => str(t, 100))
    )
      throw new Error("Backup contains invalid playlists.")
  for (const e of b.events)
    if (
      !e ||
      !str(e.id, 100) ||
      !str(e.trackId, 100) ||
      !num(e.started) ||
      !num(e.seconds) ||
      typeof e.qualified !== "boolean" ||
      (e.qualifiedAt !== undefined && !num(e.qualifiedAt))
    )
      throw new Error("Backup contains invalid listening history.")
  for (const e of b.events)
    if (
      e.daily &&
      (typeof e.daily !== "object" ||
        Object.keys(e.daily).length > 10000 ||
        !Object.entries(e.daily).every(
          ([day, seconds]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && num(seconds),
        ))
    )
      throw new Error("Backup contains invalid daily listening data.")
  const p = b.preferences
  if (
    !p ||
    !str(p.theme, 100) ||
    !num(p.volume) ||
    p.volume > 1 ||
    !["off", "all", "one"].includes(p.repeat) ||
    !(canvasModeIds as readonly string[]).includes(p.mode) ||
    !["muted", "shuffle", "reducedMotion", "companion"].every(
      (k) => typeof p[(k as keyof Preferences)] === "boolean",
    ) ||
    ![
      "trackListeningHistory",
      "personalizedRecommendations",
      "rememberPlaybackPosition",
    ].every(
      (k) =>
        p[(k as keyof Preferences)] === undefined ||
        typeof p[(k as keyof Preferences)] === "boolean",
    ) ||
    !Array.isArray(p.customs) ||
    p.customs.length > 100 ||
    !p.customs.every(validTheme)
  )
    throw new Error("Backup contains invalid preferences.")
  if (
    (p.librarySort !== undefined &&
      !["added", "title", "artist", "album", "duration", "plays"].includes(
        p.librarySort,
      )) ||
    (p.libraryView !== undefined &&
      !["list", "grid"].includes(p.libraryView)) ||
    (p.canvas !== undefined &&
      (typeof p.canvas !== "object" ||
        p.canvas === null ||
        !Object.values(p.canvas).every(
          (v) =>
            typeof v === "string" ||
            typeof v === "boolean" ||
            Number.isFinite(v),
        )))
  )
    throw new Error("Backup contains invalid library preferences.")
  if (b.version === 2) {
    if (
      !Array.isArray(b.recommendationProfiles) ||
      !Array.isArray(b.recommendationFeedback) ||
      !b.recommendationSettings
    )
      throw new Error("Backup contains invalid recommendation data.")
    for (const profile of b.recommendationProfiles) {
      if (
        !recommendationPurposeIds.includes(profile.purpose) ||
        ![10, 20, 30, 50].includes(profile.targetSize) ||
        !Array.isArray(profile.preferredGenres) ||
        !Array.isArray(profile.preferredTags) ||
        profile.preferredGenres.length > 24 ||
        profile.preferredTags.length > 24 ||
        ![...profile.preferredGenres, ...profile.preferredTags].every((value) =>
          str(value, 80),
        ) ||
        (profile.weights &&
          Object.values(profile.weights).some(
            (value) =>
              typeof value !== "number" ||
              !Number.isFinite(value) ||
              value < 0 ||
              value > 20,
          ))
      )
        throw new Error("Backup contains invalid recommendation profiles.")
    }
    for (const item of b.recommendationFeedback)
      if (
        !str(item.id, 220) ||
        !recommendationPurposeIds.includes(item.purpose) ||
        !str(item.trackId, 100) ||
        ![1, -1].includes(item.affinity) ||
        !num(item.updatedAt)
      )
        throw new Error("Backup contains invalid recommendation feedback.")
    if (
      !Array.isArray(b.recommendationSettings.excludedTrackIds) ||
      !b.recommendationSettings.excludedTrackIds.every((id) => str(id, 100)) ||
      Object.entries(b.recommendationSettings.refreshSeeds).some(
        ([purpose, seed]) =>
          !recommendationPurposeIds.includes(
            purpose as typeof recommendationPurposeIds[number],
          ) ||
          typeof seed !== "number" ||
          !Number.isFinite(seed),
      )
    )
      throw new Error("Backup contains invalid recommendation settings.")
  }
  return b
}
export async function restoreBackup(b: Backup) {
  validateBackup(b)
  const db = await database()
  const tx = db.transaction(
    [
      "tracks",
      "playlists",
      "events",
      "settings",
      "recommendationProfiles",
      "recommendationFeedback",
    ],
    "readwrite",
  )
  const existing = await tx.objectStore("tracks").getAll(),
    map = new Map<string, string>()
  for (const track of b.tracks) {
    const match = existing.find((t) => t.fingerprint === track.fingerprint)
    const id = match?.id || crypto.randomUUID()
    map.set(track.id, id)
    if (match) {
      await tx.objectStore("tracks").put({
        ...match,
        genres: normalizeMetadataList(track.genres).length
          ? normalizeMetadataList(track.genres)
          : match.genres,
        moodTags: normalizeMetadataList(track.moodTags).length
          ? normalizeMetadataList(track.moodTags)
          : match.moodTags,
      })
    } else await tx.objectStore("tracks").put({
        id,
        title: cleanText(track.title),
        artist: cleanText(track.artist),
        album: cleanText(track.album),
        filename: cleanText(track.filename),
        duration: track.duration,
        size: track.size,
        fingerprint: track.fingerprint,
        added: track.added,
        favorite: track.favorite,
        plays: 0,
        missing: true,
        genres: normalizeMetadataList(track.genres),
        moodTags: normalizeMetadataList(track.moodTags),
      })
  }
  const existingPlaylists = await tx.objectStore("playlists").getAll()
  for (const p of b.playlists) await tx.objectStore("playlists").put({
      id: crypto.randomUUID(),
      description: cleanText(p.description, 2000),
      created: p.created,
      name: existingPlaylists.some((x) => x.name === p.name)
        ? `${cleanText(p.name, 100)} (Imported)`
        : cleanText(p.name, 100),
      tracks: p.tracks
        .map((id) => map.get(id))
        .filter((id): id is string => !!id),
    })
  for (const event of b.events) {
    if (
      !(await tx.objectStore("events").get(event.id)) &&
      map.has(event.trackId)
    )
      await tx
        .objectStore("events")
        .put({ ...event, trackId: map.get(event.trackId)! })
  }
  const allEvents = await tx.objectStore("events").getAll()
  for (const track of await tx.objectStore("tracks").getAll()) {
    const qualified = allEvents.filter(
      (e) => e.trackId === track.id && e.qualified,
    )
    await tx.objectStore("tracks").put({
      ...track,
      plays: qualified.length,
      lastPlayed: qualified.length
        ? Math.max(...qualified.map((e) => e.qualifiedAt ?? e.started))
        : undefined,
    })
  }
  const existingPreferences = (await tx
    .objectStore("settings")
    .get("preferences")) as Preferences | undefined
  const customs = [...(existingPreferences?.customs || [])]
  let selectedTheme = b.preferences.theme
  for (const theme of b.preferences.customs) {
    const id = `custom-${crypto.randomUUID()}`
    if (selectedTheme === theme.id) selectedTheme = id
    customs.push({
      ...theme,
      id,
      name: customs.some((t) => t.name === theme.name)
        ? `${theme.name} (Imported)`
        : theme.name,
    })
  }
  const preferences = {
    ...defaults,
    ...b.preferences,
    customs,
    theme: selectedTheme,
  }
  await tx.objectStore("settings").put(preferences, "preferences")
  if (b.version === 2) {
    for (const profile of b.recommendationProfiles || [])
      await tx.objectStore("recommendationProfiles").put({
        ...profile,
        preferredGenres: normalizeMetadataList(profile.preferredGenres),
        preferredTags: normalizeMetadataList(profile.preferredTags),
      })
    for (const item of b.recommendationFeedback || []) {
      const trackId = map.get(item.trackId)
      if (!trackId) continue
      const id = `${item.purpose}:${trackId}`
      const current = await tx.objectStore("recommendationFeedback").get(id)
      if (!current || current.updatedAt <= item.updatedAt)
        await tx.objectStore("recommendationFeedback").put({
          ...item,
          id,
          trackId,
        })
    }
    const existingRecommendations = (await tx
      .objectStore("settings")
      .get("recommendations")) as RecommendationSettings | undefined
    const exclusions = (b.recommendationSettings?.excludedTrackIds || [])
      .map((id) => map.get(id))
      .filter((id): id is string => !!id)
    await tx.objectStore("settings").put(
      {
        excludedTrackIds: [
          ...new Set([
            ...(existingRecommendations?.excludedTrackIds || []),
            ...exclusions,
          ]),
        ],
        refreshSeeds: {
          ...(existingRecommendations?.refreshSeeds || {}),
          ...(b.recommendationSettings?.refreshSeeds || {}),
        },
      },
      "recommendations",
    )
  }
  await tx.done
  return preferences
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  )
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
