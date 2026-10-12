/** Pure, deterministic smart-playlist scoring from local metadata and history. */
import type {
  ListeningEvent,
  RecommendationFeedback,
  RecommendationProfile,
  RecommendationPurpose,
  RecommendationSettings,
  RecommendationWeights,
  Track,
} from "./models"
import { normalizeMetadataList } from "./metadata"

export const recommendationPurposes: {
  id: RecommendationPurpose
  name: string
  detail: string
  tags: string[]
  genres: string[]
}[] = [
  {
    id: "happy",
    name: "Happy & Energized",
    detail: "Bright, upbeat music for a lift.",
    tags: ["happy", "energized", "upbeat", "joy", "party"],
    genres: ["dance", "pop", "funk", "disco", "house"],
  },
  {
    id: "reflective",
    name: "Sad & Reflective",
    detail: "Quiet, emotional music for slower moments.",
    tags: ["sad", "reflective", "melancholy", "emotional"],
    genres: ["singer-songwriter", "folk", "blues", "ambient"],
  },
  {
    id: "focus",
    name: "Study & Deep Focus",
    detail: "Steady, low-distraction music for concentration.",
    tags: ["focus", "study", "concentration", "instrumental"],
    genres: ["ambient", "classical", "minimal", "soundtrack", "lo-fi"],
  },
  {
    id: "sleep",
    name: "Sleep & Unwind",
    detail: "Gentle music for settling down.",
    tags: ["sleep", "unwind", "calm", "soft"],
    genres: ["ambient", "classical", "new age", "drone"],
  },
  {
    id: "chill",
    name: "Chill & Relaxed",
    detail: "Easygoing music with room to breathe.",
    tags: ["chill", "relaxed", "calm", "easygoing"],
    genres: ["chillout", "downtempo", "lo-fi", "jazz", "reggae"],
  },
  {
    id: "workout",
    name: "Workout & Motivation",
    detail: "Driving music for movement and momentum.",
    tags: ["workout", "motivation", "energetic", "running"],
    genres: ["dance", "electronic", "hip-hop", "rock", "metal"],
  },
  {
    id: "nostalgic",
    name: "Nostalgic",
    detail: "Songs you marked for memories and rediscovery.",
    tags: ["nostalgic", "memories", "throwback", "classic"],
    genres: [],
  },
  {
    id: "late-night",
    name: "Late-Night Listening",
    detail: "Music that fits the hours after dark.",
    tags: ["late night", "night", "after hours", "midnight"],
    genres: ["ambient", "downtempo", "jazz", "trip-hop", "r&b"],
  },
]

export const defaultRecommendationWeights: RecommendationWeights = {
  moodTag: 8,
  genre: 5,
  profile: 7,
  directFeedback: 12,
  feedbackSimilarity: 3,
  favorite: 1.5,
  playCount: 1,
  recency: 1,
  timeOfDay: 2,
}

export const defaultRecommendationProfiles = Object.fromEntries(
  recommendationPurposes.map((purpose) => [
    purpose.id,
    {
      purpose: purpose.id,
      targetSize: 20,
      preferredGenres: [],
      preferredTags: [],
      weights: {},
    },
  ]),
) as unknown as Record<RecommendationPurpose, RecommendationProfile>

export type RecommendationReason = {
  id: keyof RecommendationWeights | "tieBreak"
  label: string
  value: number
}
export type ScoredRecommendation = {
  trackId: string
  score: number
  reasons: RecommendationReason[]
}
export type RecommendationResult = {
  entries: ScoredRecommendation[]
  eligibleCount: number
  requestedCount: number
  limitation?: "empty-library" | "no-match" | "insufficient-matches"
}
export type RecommendationRequest = {
  tracks: readonly Track[]
  events: readonly ListeningEvent[]
  purpose: RecommendationPurpose
  profile?: RecommendationProfile
  feedback?: readonly RecommendationFeedback[]
  settings?: RecommendationSettings
  personalized: boolean
  now: number
  seed?: number
}

const labels: Record<keyof RecommendationWeights, string> = {
  moodTag: "Matching mood/activity tag",
  genre: "Matching genre",
  profile: "Your preferred tag or genre",
  directFeedback: "Your direct feedback",
  feedbackSimilarity: "Similar to your feedback",
  favorite: "Favorite",
  playCount: "Frequently played",
  recency: "Rediscovery",
  timeOfDay: "Played at this time",
}
const lower = (values: readonly string[] | undefined) =>
  new Set(
    normalizeMetadataList(values).map((value) => value.toLocaleLowerCase()),
  )
const overlap = (a: Set<string>, b: Set<string>) =>
  [...a].filter((value) => b.has(value)).length
const clampWeight = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(20, value))
    : fallback
const feedbackId = (purpose: RecommendationPurpose, trackId: string) =>
  `${purpose}:${trackId}`

function seededFraction(value: string, seed: number) {
  let hash = seed | 0
  for (const char of value)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return ((hash >>> 0) % 1000) / 1_000_000
}

export function scoreTrack(
  track: Track,
  context: RecommendationRequest,
): ScoredRecommendation | null {
  if (track.missing || context.settings?.excludedTrackIds.includes(track.id))
    return null
  const purpose = recommendationPurposes.find(
    (item) => item.id === context.purpose,
  )!
  const profile =
    context.profile || defaultRecommendationProfiles[context.purpose]
  const weights = Object.fromEntries(
    Object.entries(defaultRecommendationWeights).map(([key, fallback]) => [
      key,
      clampWeight(
        profile.weights?.[(key as keyof RecommendationWeights)],
        fallback,
      ),
    ]),
  ) as RecommendationWeights
  const tags = lower(track.moodTags)
  const genres = lower(track.genres)
  const purposeTags = lower(purpose.tags)
  const purposeGenres = lower(purpose.genres)
  const preferredTags = lower(profile.preferredTags)
  const preferredGenres = lower(profile.preferredGenres)
  const reasons: RecommendationReason[] = []
  const add = (id: keyof RecommendationWeights, units: number) => {
    const value = units * weights[id]
    if (value) reasons.push({ id, label: labels[id], value })
  }
  add("moodTag", overlap(tags, purposeTags))
  add("genre", overlap(genres, purposeGenres))
  add(
    "profile",
    overlap(tags, preferredTags) + overlap(genres, preferredGenres),
  )
  const feedback = context.feedback || []
  const direct = feedback.find(
    (item) =>
      item.id === feedbackId(context.purpose, track.id) ||
      (item.purpose === context.purpose && item.trackId === track.id),
  )
  if (direct) add("directFeedback", direct.affinity)
  let similarity = 0
  for (const item of feedback.filter(
    (entry) => entry.purpose === context.purpose && entry.trackId !== track.id,
  )) {
    const reference = context.tracks.find(
      (candidate) => candidate.id === item.trackId,
    )
    if (!reference) continue
    const tagMatches = overlap(tags, lower(reference.moodTags))
    const genreMatches = overlap(genres, lower(reference.genres))
    const artistMatch =
      track.artist !== "Unknown artist" &&
      track.artist.toLocaleLowerCase() === reference.artist.toLocaleLowerCase()
        ? 0.25
        : 0
    similarity +=
      item.affinity * (tagMatches + genreMatches * 0.6 + artistMatch)
  }
  add("feedbackSimilarity", Math.max(-2, Math.min(2, similarity)))
  const evidence = reasons.reduce((total, reason) => total + reason.value, 0)
  if (evidence <= 0) return null
  if (context.personalized) {
    if (track.favorite) add("favorite", 1)
    if (track.plays) add("playCount", Math.min(3, Math.log2(track.plays + 1)))
    if (
      context.purpose === "nostalgic" &&
      track.lastPlayed &&
      context.now - track.lastPlayed > 30 * 86_400_000
    )
      add("recency", 1)
    if (context.purpose === "late-night") {
      const latePlays = context.events.filter((event) => {
        if (event.trackId !== track.id || !event.qualified) return false
        const hour = new Date(event.started).getHours()
        return hour >= 22 || hour < 5
      }).length
      if (latePlays) add("timeOfDay", Math.min(2, Math.log2(latePlays + 1)))
    }
  }
  const tie = seededFraction(track.fingerprint || track.id, context.seed || 0)
  const score = reasons.reduce((total, reason) => total + reason.value, 0) + tie
  return { trackId: track.id, score, reasons }
}

export function generateSmartPlaylist(
  request: RecommendationRequest,
): RecommendationResult {
  if (!request.tracks.length)
    return {
      entries: [],
      eligibleCount: 0,
      requestedCount: request.profile?.targetSize || 20,
      limitation: "empty-library",
    }
  const unique: Track[] = []
  const ids = new Set<string>()
  const fingerprints = new Set<string>()
  for (const track of request.tracks) {
    if (ids.has(track.id) || fingerprints.has(track.fingerprint)) continue
    ids.add(track.id)
    fingerprints.add(track.fingerprint)
    unique.push(track)
  }
  const scored = unique
    .map((track) => scoreTrack(track, { ...request, tracks: unique }))
    .filter((item): item is ScoredRecommendation => !!item)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (
          unique.find((track) => track.id === a.trackId)?.title || ""
        ).localeCompare(
          unique.find((track) => track.id === b.trackId)?.title || "",
        ) ||
        a.trackId.localeCompare(b.trackId),
    )
  const requestedCount = request.profile?.targetSize || 20
  const artistCap = Math.max(2, Math.ceil(requestedCount * 0.2))
  const selected: ScoredRecommendation[] = []
  const remaining = [...scored]
  const artistCounts = new Map<string, number>()
  while (remaining.length && selected.length < requestedCount) {
    let index = remaining.findIndex((entry) => {
      const track = unique.find((candidate) => candidate.id === entry.trackId)!
      const previous = selected.at(-1)
      const previousArtist = previous
        ? unique.find((candidate) => candidate.id === previous.trackId)?.artist
        : undefined
      return (
        track.artist !== previousArtist &&
        (artistCounts.get(track.artist) || 0) < artistCap
      )
    })
    if (index < 0) index = 0
    const [entry] = remaining.splice(index, 1)
    selected.push(entry)
    const artist = unique.find((track) => track.id === entry.trackId)!.artist
    artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1)
  }
  return {
    entries: selected,
    eligibleCount: scored.length,
    requestedCount,
    limitation: !scored.length
      ? "no-match"
      : selected.length < requestedCount
        ? "insufficient-matches"
        : undefined,
  }
}

export const localRecommendationProvider = {
  kind: "local" as const,
  generate: generateSmartPlaylist,
}
