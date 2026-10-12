import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it } from "vitest"
import {
  clearDatabase,
  database,
  loadLibrary,
  removeTrack,
  saveEvent,
  saveTrack,
  saveRecommendationProfile,
  saveRecommendationFeedback,
  saveRecommendationSettings,
} from "../src/storage"
import { defaults, type Track } from "../src/models"
import { createBackup, restoreBackup, validateBackup } from "../src/backup"
import {
  playedInterval,
  qualifies,
  addDailyInterval,
  localDay,
} from "../src/statistics"
import { validTheme, themes, accessibleAccent } from "../src/themes"
import { generateSmartPlaylist } from "../src/recommendations"
const track: Track = {
  id: "track-a",
  title: "Signal",
  artist: "Local artist",
  album: "Test album",
  filename: "signal.wav",
  size: 5,
  duration: 10,
  fingerprint: "same",
  added: 1000,
  plays: 0,
  favorite: true,
}
beforeEach(async () => {
  await clearDatabase()
})
describe("durable library", () => {
  it("round-trips metadata and audio independently", async () => {
    await saveTrack(track, {
      id: track.id,
      blob: new Blob(["audio"], { type: "audio/wav" }),
    })
    const saved = await loadLibrary()
    expect(saved.tracks).toEqual([track])
    expect("blob" in saved.tracks[0]).toBe(false)
    const source = await (await database()).get("sources", track.id)
    expect(await source!.blob!.text()).toBe("audio")
  })
  it("persists preferences, ordered playlists and queue", async () => {
    const db = await database()
    await db.put("settings", { ...defaults, theme: "analog" }, "preferences")
    await db.put(
      "settings",
      { queue: [{ id: "q1", trackId: track.id }], index: 0, position: 4 },
      "session",
    )
    await db.put("playlists", {
      id: "p",
      name: "My mood",
      description: "",
      tracks: ["a", "b", "a"],
      created: 1,
    })
    const saved = await loadLibrary()
    expect(saved.preferences?.theme).toBe("analog")
    expect(saved.session?.position).toBe(4)
    expect(saved.playlists[0].tracks).toEqual(["a", "b", "a"])
  })
  it("round-trips IndexedDB v3 recommendation state", async () => {
    await saveRecommendationProfile({
      purpose: "focus",
      targetSize: 30,
      preferredGenres: ["Ambient"],
      preferredTags: ["Study"],
      weights: { genre: 9 },
    })
    await saveRecommendationFeedback({
      id: "focus:track-a",
      purpose: "focus",
      trackId: "track-a",
      affinity: 1,
      updatedAt: 20,
    })
    await saveRecommendationSettings({
      excludedTrackIds: ["track-a"],
      refreshSeeds: { focus: 3 },
    })
    const saved = await loadLibrary()
    expect(saved.recommendationProfiles.focus?.targetSize).toBe(30)
    expect(saved.recommendationFeedback[0].affinity).toBe(1)
    expect(saved.recommendationSettings.refreshSeeds.focus).toBe(3)
  })
  it("loads artwork without reading or cloning the audio source", async () => {
    const artwork = new Blob(["cover"], { type: "image/png" })
    await saveTrack(track, { id: track.id, blob: new Blob(["audio"]), artwork })
    const db = await database()
    expect(await (await db.get("artwork", track.id))!.text()).toBe("cover")
    expect((await db.get("sources", track.id))!.artwork).toBeUndefined()
    await removeTrack(track.id)
    expect(await db.get("artwork", track.id)).toBeUndefined()
  })
  it("qualifies an event once, atomically with the counter", async () => {
    await saveTrack(track, { id: track.id, blob: new Blob(["audio"]) })
    const event = {
      id: "e",
      trackId: track.id,
      started: 100,
      seconds: 6,
      qualified: true,
      qualifiedAt: 200,
    }
    await saveEvent(event)
    await saveEvent({ ...event, seconds: 8 })
    expect((await loadLibrary()).tracks[0].plays).toBe(1)
    expect((await loadLibrary()).events[0].seconds).toBe(8)
  })
  it("removes app audio and cleans playlist references", async () => {
    await saveTrack(track, { id: track.id, blob: new Blob(["audio"]) })
    const db = await database()
    await db.put("playlists", {
      id: "p",
      name: "P",
      description: "",
      tracks: [track.id, "other", track.id],
      created: 1,
    })
    await removeTrack(track.id)
    expect((await loadLibrary()).tracks).toHaveLength(0)
    expect(await db.get("sources", track.id)).toBeUndefined()
    expect((await loadLibrary()).playlists[0].tracks).toEqual(["other"])
  })
})
describe("honest listening", () => {
  it("excludes seeking, pause and discontinuities", () => {
    expect(playedInterval(1, 1, true, false)).toBe(1)
    expect(playedInterval(1, 50, true, false)).toBe(0)
    expect(playedInterval(1, 1, false, false)).toBe(0)
    expect(playedInterval(1, 1, true, true)).toBe(0)
    expect(playedInterval(1, -10, true, false)).toBe(0)
  })
  it("requires known duration and half a short track or 30 seconds", () => {
    expect(qualifies(100, 0)).toBe(false)
    expect(qualifies(5, 10)).toBe(true)
    expect(qualifies(29, 200)).toBe(false)
    expect(qualifies(30, 200)).toBe(true)
  })
  it("splits actual listening at local midnight", () => {
    const midnight = new Date(2026, 5, 1, 0, 0, 0).getTime()
    const daily: Record<string, number> = {}
    addDailyInterval(daily, midnight + 1000, 3)
    expect(daily[localDay(midnight - 1)]).toBe(2)
    expect(daily[localDay(midnight)]).toBe(1)
  })
})
describe("safe backups and themes", () => {
  it("rejects malformed backup before writing", async () => {
    expect(() => validateBackup({ version: 2 })).toThrow()
    const b = await createBackup()
    expect(() =>
      validateBackup({ ...b, tracks: [{ ...track, duration: -1 }] }),
    ).toThrow()
    expect(() =>
      validateBackup({ ...b, preferences: { ...defaults, volume: 5 } }),
    ).toThrow()
    expect((await loadLibrary()).tracks).toHaveLength(0)
  })
  it("merges by fingerprint, preserves audio and deduplicates events", async () => {
    await saveTrack(track, { id: track.id, blob: new Blob(["original"]) })
    const b = await createBackup()
    b.tracks[0].id = "old-id"
    b.events = [
      {
        id: "event",
        trackId: "old-id",
        seconds: 6,
        started: 1,
        qualified: true,
        qualifiedAt: 7,
      },
    ]
    await restoreBackup(b)
    await restoreBackup(b)
    const data = await loadLibrary()
    expect(data.tracks).toHaveLength(1)
    expect(data.events).toHaveLength(1)
    expect(data.tracks[0].plays).toBe(1)
    expect(
      await (await (await database()).get("sources", track.id))!.blob!.text(),
    ).toBe("original")
  })
  it("marks metadata-only restored tracks unavailable", async () => {
    const b = await createBackup()
    b.tracks = [track]
    await restoreBackup(b)
    expect((await loadLibrary()).tracks[0].missing).toBe(true)
  })
  it("validates theme colors and picks contrasting accent ink", () => {
    expect(themes.every(validTheme)).toBe(true)
    expect(validTheme({ ...themes[0], accent: "url(malicious)" })).toBe(false)
    expect(validTheme({ ...themes[0], secondary: "url(malicious)" })).toBe(
      false,
    )
    expect(validTheme({ ...themes[0], material: "unknown" })).toBe(false)
    expect(accessibleAccent("#ffffff")).toBe("#101719")
    expect(accessibleAccent("#000000")).toBe("#ffffff")
  })
})
describe("local recommendations", () => {
  const fresh = {
    ...track,
    id: "fresh",
    fingerprint: "fresh",
    favorite: false,
    plays: 0,
    added: Date.now(),
  }
  const familiar = {
    ...track,
    id: "familiar",
    fingerprint: "familiar",
    plays: 8,
    added: 1,
    moodTags: ["happy"],
  }
  it("uses matching real metadata and excludes unrelated tracks", () => {
    const result = generateSmartPlaylist({
      tracks: [familiar, fresh],
      events: [],
      purpose: "happy",
      personalized: true,
      now: 10,
    })
    expect(result.entries.map((entry) => entry.trackId)).toEqual(["familiar"])
  })
  it("never recommends missing tracks", () => {
    expect(
      generateSmartPlaylist({
        tracks: [{ ...familiar, missing: true }],
        events: [],
        purpose: "happy",
        personalized: true,
        now: 10,
      }).entries,
    ).toEqual([])
  })
})
