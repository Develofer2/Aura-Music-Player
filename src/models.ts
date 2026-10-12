/** Shared data types and default preferences. Copyright (c) 2026 Develofer2. MIT License. */
import type { AudioSettings } from "./audioFx"
export type Track = {
  id: string
  title: string
  artist: string
  album: string
  filename: string
  duration: number
  size: number
  fingerprint: string
  added: number
  favorite: boolean
  plays: number
  lastPlayed?: number
  missing?: boolean
  access?: "copy" | "reference"
  genres?: string[]
  moodTags?: string[]
}
export type Source = {
  id: string
  blob?: Blob
  artwork?: Blob
  handle?: FileSystemFileHandle
}
export const recommendationPurposeIds = [
  "happy",
  "reflective",
  "focus",
  "sleep",
  "chill",
  "workout",
  "nostalgic",
  "late-night",
] as const
export type RecommendationPurpose = typeof recommendationPurposeIds[number]
export type RecommendationWeights = {
  moodTag: number
  genre: number
  profile: number
  directFeedback: number
  feedbackSimilarity: number
  favorite: number
  playCount: number
  recency: number
  timeOfDay: number
}
export type RecommendationProfile = {
  purpose: RecommendationPurpose
  targetSize: 10 | 20 | 30 | 50
  preferredGenres: string[]
  preferredTags: string[]
  weights?: Partial<RecommendationWeights>
}
export type RecommendationFeedback = {
  id: string
  purpose: RecommendationPurpose
  trackId: string
  affinity: 1 | -1
  updatedAt: number
}
export type RecommendationSettings = {
  excludedTrackIds: string[]
  refreshSeeds: Partial<Record<RecommendationPurpose, number>>
}
export type TrackAvailability = "stored" | "original" | "permission-required" | "missing"
export type Playlist = {
  id: string
  name: string
  description: string
  tracks: string[]
  created: number
  coverId?: string
}
export type ListeningEvent = {
  id: string
  trackId: string
  started: number
  seconds: number
  qualified: boolean
  qualifiedAt?: number
  daily?: Record<string, number>
}
export const canvasModeIds = [
  "Artwork",
  "Vinyl",
  "CD",
  "Progress",
  "Atmosphere",
  "Cassette",
  "Turntable",
  "Equaliser",
  "Scope",
  "Typography",
  "Aurora",
  "Radio",
  "Orbit",
] as const
export type CanvasMode = typeof canvasModeIds[number]
export type CanvasPalette = "theme" | "cover" | "rainbow"
export interface CanvasSettings {
  intensity: number
  speed: number
  palette: CanvasPalette
  showLabels: boolean
}
export const canvasDefaults: CanvasSettings = {
  intensity: 0.7,
  speed: 1,
  palette: "theme",
  showLabels: true,
}
export type Theme = {
  id: string
  name: string
  description: string
  bg: string
  surface: string
  accent: string
  text: string
  muted: string
  rounded?: boolean
  glow?: boolean
  background?: "solid" | "gradient" | "texture"
  motion?: "none" | "gentle" | "full"
  material?: "studio" | "glass" | "neon" | "solar" | "holographic" | "aurora" | "analog" | "chrome" | "velvet" | "rainbow" | "anime" | "nature"
  secondary?: string
}
export type Preferences = {
  theme: string
  volume: number
  muted: boolean
  repeat: "off" | "all" | "one"
  shuffle: boolean
  mode: CanvasMode
  reducedMotion: boolean
  companion: boolean
  customs: Theme[]
  librarySort?: string
  libraryView?: "list" | "grid"
  audio?: Partial<AudioSettings>
  canvas?: Partial<CanvasSettings>
  trackListeningHistory: boolean
  personalizedRecommendations: boolean
  rememberPlaybackPosition: boolean
  offlineIntroDismissed?: boolean
}
export interface QueueEntry {
  id: string
  trackId: string
}
export interface Session {
  queue: QueueEntry[]
  index: number
  position: number
}
export const defaults: Preferences = {
  theme: "glass",
  volume: 0.75,
  muted: false,
  repeat: "off",
  shuffle: false,
  mode: "CD",
  reducedMotion: false,
  companion: false,
  customs: [],
  trackListeningHistory: true,
  personalizedRecommendations: true,
  rememberPlaybackPosition: true,
}
export const emptySession: Session = { queue: [], index: 0, position: 0 }
