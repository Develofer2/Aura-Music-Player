/** IndexedDB access layer and storage error messaging. Copyright (c) 2026 Develofer2. MIT License. */
import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import type {
  Track,
  Source,
  Playlist,
  ListeningEvent,
  Preferences,
  Session,
  RecommendationProfile,
  RecommendationFeedback,
  RecommendationSettings,
  RecommendationPurpose,
  TrackAvailability,
} from "./models"
import { defaultRecommendationProfiles } from "./recommendations"
interface RecordSchema<T> {
  key: string
  value: T
}
interface AuraDB extends DBSchema {
  tracks: RecordSchema<Track>
  sources: RecordSchema<Source>
  playlists: RecordSchema<Playlist>
  events: RecordSchema<ListeningEvent>
  settings: RecordSchema<Preferences | Session | RecommendationSettings>
  artwork: RecordSchema<Blob>
  recommendationProfiles: RecordSchema<RecommendationProfile>
  recommendationFeedback: RecordSchema<RecommendationFeedback>
}
export const defaultRecommendationSettings: RecommendationSettings = {
  excludedTrackIds: [],
  refreshSeeds: {},
}
let connection: Promise<IDBPDatabase<AuraDB>> | undefined
export function database() {
  if (!connection) {
    connection = openDB<AuraDB>("aura", 3, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          for (const name of [
            "tracks",
            "sources",
            "playlists",
            "events",
          ] as const)
            db.createObjectStore(name, { keyPath: "id" })
          db.createObjectStore("settings")
        }
        if (oldVersion < 2) {
          db.createObjectStore("artwork")
          let cursor = await tx.objectStore("sources").openCursor()
          while (cursor) {
            if (cursor.value.artwork) {
              await tx
                .objectStore("artwork")
                .put(cursor.value.artwork, cursor.value.id)
              const { artwork: _artwork, ...source } = cursor.value
              await cursor.update(source)
            }
            cursor = await cursor.continue()
          }
        }
        if (oldVersion < 3) {
          db.createObjectStore("recommendationProfiles", {
            keyPath: "purpose",
          })
          db.createObjectStore("recommendationFeedback", { keyPath: "id" })
        }
      },
      blocking() {
        void connection?.then((db) => db.close())
        connection = undefined
      },
    }).catch((error) => {
      connection = undefined
      throw error
    })
  }
  return connection
}
export async function loadLibrary() {
  const db = await database()
  const [
    tracks,
    playlists,
    events,
    preferences,
    session,
    profiles,
    feedback,
    recommendationSettings,
  ] = await Promise.all([
    db.getAll("tracks"),
    db.getAll("playlists"),
    db.getAll("events"),
    db.get("settings", "preferences"),
    db.get("settings", "session"),
    db.getAll("recommendationProfiles"),
    db.getAll("recommendationFeedback"),
    db.get("settings", "recommendations"),
  ])
  for (const track of tracks.filter((track) => track.access === "reference")) {
    try {
      const source = await db.get("sources", track.id)
      if (source?.blob) {
        if (track.missing) {
          track.missing = false
          await db.put("tracks", track)
        }
        continue
      }
      const handle = source?.handle as FileSystemFileHandle & {
        queryPermission?(options: { mode: string }): Promise<string>
      } | undefined
      const missing = !handle
      if (track.missing !== missing) {
        track.missing = missing
        await db.put("tracks", track)
      }
    } catch {
      track.missing = true
      await db.put("tracks", track)
    }
  }
  return {
    tracks,
    playlists,
    events,
    preferences: preferences as Preferences | undefined,
    session: session as Session | undefined,
    recommendationProfiles: Object.fromEntries(
      profiles.map((profile) => [profile.purpose, profile]),
    ) as Partial<Record<RecommendationPurpose, RecommendationProfile>>,
    recommendationFeedback: feedback,
    recommendationSettings: {
      ...defaultRecommendationSettings,
      ...recommendationSettings as RecommendationSettings | undefined,
    },
  }
}
export async function saveTrack(track: Track, source: Source) {
  const db = await database()
  const tx = db.transaction(["tracks", "sources", "artwork"], "readwrite")
  const { artwork, ...audioSource } = source
  await Promise.all([
    tx.objectStore("tracks").put(track),
    tx.objectStore("sources").put(audioSource),
    artwork
      ? tx.objectStore("artwork").put(artwork, track.id)
      : tx.objectStore("artwork").delete(track.id),
  ])
  await tx.done
}
export async function saveEvent(event: ListeningEvent) {
  const db = await database()
  const tx = db.transaction(["tracks", "events"], "readwrite")
  const previous = await tx.objectStore("events").get(event.id)
  const track = await tx.objectStore("tracks").get(event.trackId)
  if (track && event.qualified && !previous?.qualified) {
    track.plays++
    track.lastPlayed = event.qualifiedAt ?? Date.now()
    await tx.objectStore("tracks").put(track)
  }
  await tx.objectStore("events").put(event)
  await tx.done
}
export async function removeTrack(id: string) {
  const db = await database()
  const tx = db.transaction(
    [
      "tracks",
      "sources",
      "playlists",
      "artwork",
      "recommendationFeedback",
      "settings",
    ],
    "readwrite",
  )
  const playlists = await tx.objectStore("playlists").getAll()
  for (const p of playlists) {
    p.tracks = p.tracks.filter((t) => t !== id)
    await tx.objectStore("playlists").put(p)
  }
  await tx.objectStore("tracks").delete(id)
  await tx.objectStore("sources").delete(id)
  await tx.objectStore("artwork").delete(id)
  for (const item of await tx.objectStore("recommendationFeedback").getAll())
    if (item.trackId === id)
      await tx.objectStore("recommendationFeedback").delete(item.id)
  const settings = (await tx
    .objectStore("settings")
    .get("recommendations")) as RecommendationSettings | undefined
  if (settings?.excludedTrackIds.includes(id))
    await tx.objectStore("settings").put(
      {
        ...settings,
        excludedTrackIds: settings.excludedTrackIds.filter(
          (trackId) => trackId !== id,
        ),
      },
      "recommendations",
    )
  await tx.done
}
export async function clearDatabase() {
  const db = await database()
  const tx = db.transaction(
    [
      "tracks",
      "sources",
      "playlists",
      "events",
      "settings",
      "artwork",
      "recommendationProfiles",
      "recommendationFeedback",
    ],
    "readwrite",
  )
  await Promise.all(
    Array.from(tx.objectStoreNames).map((name) => tx.objectStore(name).clear()),
  )
  await tx.done
}
export async function saveRecommendationProfile(
  profile: RecommendationProfile,
) {
  return (await database()).put("recommendationProfiles", profile)
}
export async function resetRecommendationProfile(
  purpose: RecommendationPurpose,
) {
  return (await database()).delete("recommendationProfiles", purpose)
}
export async function saveRecommendationFeedback(
  feedback: RecommendationFeedback,
) {
  return (await database()).put("recommendationFeedback", feedback)
}
export async function removeRecommendationFeedback(id: string) {
  return (await database()).delete("recommendationFeedback", id)
}
export async function saveRecommendationSettings(
  settings: RecommendationSettings,
) {
  return (await database()).put("settings", settings, "recommendations")
}
export async function trackAvailability(
  id: string,
): Promise<TrackAvailability> {
  const source = await (await database()).get("sources", id)
  if (source?.blob?.size) return "stored"
  if (!source?.handle) return "missing"
  try {
    const permission = await (source.handle as FileSystemFileHandle & {
      queryPermission?(options: { mode: string }): Promise<string>
    }).queryPermission?.({ mode: "read" })
    return !permission || permission === "granted"
      ? "original"
      : "permission-required"
  } catch {
    return "permission-required"
  }
}
export async function saveOfflineCopy(id: string, blob: Blob) {
  const db = await database()
  const source = await db.get("sources", id)
  if (!source) throw new Error("Relink this track before saving it offline.")
  await db.put("sources", { ...source, id, blob })
  const track = await db.get("tracks", id)
  if (track)
    await db.put("tracks", { ...track, access: "copy", missing: false })
}
export async function removeOfflineCopy(id: string) {
  const db = await database()
  const source = await db.get("sources", id)
  if (!source?.blob) return
  if (!source.handle)
    throw new Error(
      "Relink the original file before removing this track’s offline copy.",
    )
  const { blob: _blob, ...reference } = source
  await db.put("sources", reference)
  const track = await db.get("tracks", id)
  if (track) await db.put("tracks", { ...track, access: "reference" })
}
export async function canRemoveOfflineCopy(id: string) {
  const source = await (await database()).get("sources", id)
  return !!source?.blob && !!source.handle
}
export async function copiedAudioSummary() {
  const sources = await (await database()).getAll("sources")
  return sources.reduce(
    (summary, source) => ({
      count: summary.count + (source.blob ? 1 : 0),
      bytes: summary.bytes + (source.blob?.size || 0),
    }),
    { count: 0, bytes: 0 },
  )
}
export function recommendationProfile(
  profiles: Partial<Record<RecommendationPurpose, RecommendationProfile>>,
  purpose: RecommendationPurpose,
) {
  return profiles[purpose] || defaultRecommendationProfiles[purpose]
}
export async function clearListeningHistory() {
  const db = await database()
  const tx = db.transaction(["tracks", "events"], "readwrite")
  await tx.objectStore("events").clear()
  for (const track of await tx.objectStore("tracks").getAll())
    await tx.objectStore("tracks").put({
      ...track,
      plays: 0,
      lastPlayed: undefined,
    })
  await tx.done
}
export function storageMessage(error: unknown) {
  return error instanceof DOMException && error.name === "QuotaExceededError"
    ? "Your browser storage is full. Remove some saved music or use file references, then try again."
    : error instanceof Error
      ? error.message
      : "Storage is unavailable. Your changes have not been saved."
}
