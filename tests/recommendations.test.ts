import { describe, expect, it } from "vitest"
import type { RecommendationPurpose, Track } from "../src/models"
import {
  defaultRecommendationProfiles,
  generateSmartPlaylist,
  recommendationPurposes,
} from "../src/recommendations"

const base: Track = {
  id: "track",
  title: "Signal",
  artist: "Artist",
  album: "Album",
  filename: "signal.wav",
  duration: 120,
  size: 10,
  fingerprint: "fingerprint",
  added: 1,
  favorite: false,
  plays: 0,
}
const tags: Record<RecommendationPurpose, string> = {
  happy: "happy",
  reflective: "reflective",
  focus: "focus",
  sleep: "sleep",
  chill: "chill",
  workout: "workout",
  nostalgic: "nostalgic",
  "late-night": "late night",
}
describe("smart playlist engine", () => {
  it("recognizes all eight purposes from actual tags", () => {
    for (const purpose of recommendationPurposes) {
      const result = generateSmartPlaylist({
        tracks: [{ ...base, moodTags: [tags[purpose.id]] }],
        events: [],
        purpose: purpose.id,
        personalized: false,
        now: 100,
      })
      expect(result.entries[0]?.trackId, purpose.id).toBe(base.id)
    }
  })
  it("does not make unrelated favorites eligible", () => {
    const result = generateSmartPlaylist({
      tracks: [{ ...base, favorite: true, plays: 100 }],
      events: [],
      purpose: "sleep",
      personalized: true,
      now: 100,
    })
    expect(result.entries).toEqual([])
  })
  it("honors direct feedback, exclusion and purpose scope", () => {
    const track = { ...base, moodTags: ["focus"] }
    const feedback = {
      id: "focus:track",
      purpose: "focus" as const,
      trackId: "track",
      affinity: 1 as const,
      updatedAt: 1,
    }
    expect(
      generateSmartPlaylist({
        tracks: [track],
        events: [],
        purpose: "focus",
        feedback: [feedback],
        personalized: false,
        now: 100,
      }).entries[0].reasons.some((reason) => reason.id === "directFeedback"),
    ).toBe(true)
    expect(
      generateSmartPlaylist({
        tracks: [track],
        events: [],
        purpose: "focus",
        feedback: [feedback],
        settings: { excludedTrackIds: ["track"], refreshSeeds: {} },
        personalized: false,
        now: 100,
      }).entries,
    ).toEqual([])
  })
  it("deduplicates IDs and fingerprints without mutating input", () => {
    const tracks = [
      { ...base, moodTags: ["happy"] },
      {
        ...base,
        id: "duplicate",
        title: "Duplicate",
        moodTags: ["happy"],
      },
    ]
    const snapshot = structuredClone(tracks)
    const result = generateSmartPlaylist({
      tracks,
      events: [],
      purpose: "happy",
      personalized: false,
      now: 100,
      seed: 2,
    })
    expect(result.entries).toHaveLength(1)
    expect(tracks).toEqual(snapshot)
  })
  it("returns honest limits for empty and insufficient libraries", () => {
    expect(
      generateSmartPlaylist({
        tracks: [],
        events: [],
        purpose: "happy",
        personalized: false,
        now: 100,
      }).limitation,
    ).toBe("empty-library")
    expect(
      generateSmartPlaylist({
        tracks: [{ ...base, moodTags: ["happy"] }],
        events: [],
        purpose: "happy",
        profile: defaultRecommendationProfiles.happy,
        personalized: false,
        now: 100,
      }).limitation,
    ).toBe("insufficient-matches")
  })
})
