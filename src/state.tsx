/** Library state provider: tracks, playlists, events and preferences, persisted in IndexedDB. Copyright (c) 2026 Develofer2. MIT License. */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import {
  database,
  loadLibrary,
  removeTrack,
  saveTrack,
  storageMessage,
  saveRecommendationProfile,
  resetRecommendationProfile,
  saveRecommendationFeedback,
  removeRecommendationFeedback,
  saveRecommendationSettings,
  saveOfflineCopy,
  removeOfflineCopy,
} from "./storage"
import {
  defaults,
  type Playlist,
  type Track,
  type Preferences,
  type ListeningEvent,
  type RecommendationPurpose,
  type RecommendationProfile,
  type RecommendationFeedback,
  type RecommendationSettings,
} from "./models"
import { player } from "./playback"
import { resolveSource } from "./importer"
import { cleanText, isSafeImage } from "./security"
import { normalizeMetadataList } from "./metadata"
import { defaultRecommendationSettings } from "./storage"
interface Toast {
  message: string
  action?: () => void
  label?: string
}
type State = {
  tracks: Track[]
  playlists: Playlist[]
  events: ListeningEvent[]
  prefs: Preferences
  recommendationProfiles: Partial<Record<RecommendationPurpose, RecommendationProfile>>
  recommendationFeedback: RecommendationFeedback[]
  recommendationSettings: RecommendationSettings
  ready: boolean
  error?: string
  toast?: Toast
  refresh: () => Promise<void>
  notify: (message: string, action?: () => void, label?: string) => void
  preferences: (patch: Partial<Preferences>) => Promise<void>
  favorite: (track: Track) => Promise<void>
  playlist: (playlist: Playlist) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  deleteTrack: (track: Track) => Promise<void>
  makePermanent: () => Promise<number>
  updateTrack: (
    track: Track,
    info: Pick<Track, "title" | "artist" | "album"> & {
      genres?: string[] | string
      moodTags?: string[] | string
    },
    artwork?: Blob | null,
  ) => Promise<void>
  saveRecommendationProfile: (profile: RecommendationProfile) => Promise<void>
  resetRecommendationProfile: (purpose: RecommendationPurpose) => Promise<void>
  setRecommendationFeedback: (
    purpose: RecommendationPurpose,
    trackId: string,
    affinity?: 1 | -1,
  ) => Promise<void>
  setTrackExcluded: (trackId: string, excluded: boolean) => Promise<void>
  refreshRecommendations: (purpose: RecommendationPurpose) => Promise<void>
  saveTrackOffline: (track: Track) => Promise<void>
  removeTrackOffline: (track: Track) => Promise<void>
}
const Context: React.Context<State | null> =
  import.meta.hot?.data.context ?? createContext<State | null>(null)
if (import.meta.hot) import.meta.hot.data.context = Context
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("aura-library")
    : undefined
export default function Provider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]),
    [playlists, setPlaylists] = useState<Playlist[]>([]),
    [events, setEvents] = useState<ListeningEvent[]>([])
  const [prefs, setPrefs] = useState<Preferences>(defaults),
    [ready, setReady] = useState(false),
    [error, setError] = useState<string>(),
    [toast, setToast] = useState<Toast>()
  const [recommendationProfiles, setRecommendationProfiles] =
      useState<Partial<Record<RecommendationPurpose, RecommendationProfile>>>(
        {},
      ),
    [recommendationFeedback, setRecommendationFeedback] =
      useState<RecommendationFeedback[]>([]),
    [recommendationSettings, setRecommendationSettings] =
      useState<RecommendationSettings>(defaultRecommendationSettings)
  const notify = (message: string, action?: () => void, label?: string) =>
    setToast({ message, action, label })
  async function refresh() {
    const data = await loadLibrary()
    setTracks(data.tracks)
    setPlaylists(data.playlists)
    setEvents(data.events)
    setRecommendationProfiles(data.recommendationProfiles)
    setRecommendationFeedback(data.recommendationFeedback)
    setRecommendationSettings(data.recommendationSettings)
    player.tracks = data.tracks
  }
  useEffect(() => {
    let active = true
    loadLibrary()
      .then((data) => {
        if (!active) return
        setTracks(data.tracks)
        setPlaylists(data.playlists)
        setEvents(data.events)
        setRecommendationProfiles(data.recommendationProfiles)
        setRecommendationFeedback(data.recommendationFeedback)
        setRecommendationSettings(data.recommendationSettings)
        player.tracks = data.tracks
        const p = { ...defaults, ...data.preferences }
        setPrefs(p)
        player.setPreferences(p)
        if (data.session) player.restore(data.session)
        setReady(true)
      })
      .catch((e) => setError(storageMessage(e)))
    void navigator.storage?.persisted?.().then((ok) => {
      if (!ok) void navigator.storage?.persist?.().catch(() => false)
    })
    player.onError = notify
    player.onStats = () => {
      void refresh().catch((e) => notify(storageMessage(e)))
    }
    const focused = () => {
      void refresh().catch((e) => notify(storageMessage(e)))
    }
    channel?.addEventListener("message", focused)
    window.addEventListener("focus", focused)
    return () => {
      active = false
      channel?.removeEventListener("message", focused)
      window.removeEventListener("focus", focused)
    }
  }, [])
  useEffect(() => {
    if (toast) {
      const t = setTimeout(
        () => setToast(undefined),
        toast.action ? 12000 : 6500,
      )
      return () => clearTimeout(t)
    }
  }, [toast])
  async function mutation(fn: () => Promise<unknown>) {
    try {
      await fn()
      await refresh()
      channel?.postMessage("changed")
      return true
    } catch (e) {
      notify(storageMessage(e))
      return false
    }
  }
  async function preferences(patch: Partial<Preferences>) {
    const value = { ...prefs, ...patch }
    try {
      await (await database()).put("settings", value, "preferences")
      setPrefs(value)
      player.setPreferences(value)
      if (patch.rememberPlaybackPosition === false) void player.persist()
      if (patch.shuffle != null) player.shuffle(patch.shuffle)
    } catch (e) {
      notify(storageMessage(e))
    }
  }
  async function deleteTrack(track: Track) {
    const db = await database(),
      source = await db.get("sources", track.id),
      artwork = await db.get("artwork", track.id),
      before = await db.getAll("playlists")
    if (!(await mutation(() => removeTrack(track.id)))) return
    for (const entry of [...player.state.queue])
      if (entry.trackId === track.id) player.removeEntry(entry.id)
    notify(
      `Removed “${track.title}” from this app. Original files are untouched.`,
      () => {
        void mutation(async () => {
          if (source) await saveTrack(track, { ...source, artwork })
          else await db.put("tracks", track)
          for (const p of before.filter((p) => p.tracks.includes(track.id))) {
            const current = await db.get("playlists", p.id)
            if (!current) continue
            const ids = [...current.tracks]
            p.tracks.forEach((id, index) => {
              if (id === track.id)
                ids.splice(Math.min(index, ids.length), 0, id)
            })
            await db.put("playlists", { ...current, tracks: ids })
          }
        })
        setToast(undefined)
      },
      "Undo",
    )
  }
  const state: State = {
    tracks,
    playlists,
    events,
    prefs,
    recommendationProfiles,
    recommendationFeedback,
    recommendationSettings,
    ready,
    error,
    toast,
    refresh,
    notify,
    preferences,
    favorite: async (track) => {
      await mutation(async () =>
        (await database()).put("tracks", {
          ...track,
          favorite: !track.favorite,
        }),
      )
    },
    playlist: async (p) => {
      await mutation(async () => (await database()).put("playlists", p))
    },
    deletePlaylist: async (id) => {
      await mutation(async () => (await database()).delete("playlists", id))
    },
    deleteTrack,
    makePermanent: async () => {
      let converted = 0
      const db = await database()
      for (const track of tracks.filter((t) => t.access === "reference")) {
        try {
          const source = await db.get("sources", track.id)
          if (!source) continue
          const blob = await resolveSource(source, true)
          const artwork = await db.get("artwork", track.id)
          await saveTrack({ ...track, access: "copy", missing: false }, {
            ...source,
            id: track.id,
            blob,
            artwork,
          })
          converted++
        } catch {
          /* Left as a reference; the user can relink it. */
        }
      }
      await refresh()
      channel?.postMessage("changed")
      return converted
    },
    updateTrack: async (track, info, artwork) => {
      if (artwork && !isSafeImage(artwork)) {
        notify("Cover must be a PNG, JPEG, WebP, GIF or AVIF image under 5 MB")
        return
      }
      const next = {
        ...track,
        title: cleanText(info.title, 300) || track.title,
        artist: cleanText(info.artist, 300) || "Unknown artist",
        album: cleanText(info.album, 300) || "Unknown album",
        genres: normalizeMetadataList(info.genres),
        moodTags: normalizeMetadataList(info.moodTags),
      }
      await mutation(async () => {
        const db = await database()
        await db.put("tracks", next)
        if (artwork) await db.put("artwork", artwork, track.id)
        else if (artwork === null) await db.delete("artwork", track.id)
      })
      if (artwork !== undefined)
        window.dispatchEvent(
          new CustomEvent("aura-artwork-changed", { detail: track.id }),
        )
      notify("Track details saved")
    },
    saveRecommendationProfile: async (profile) => {
      await mutation(() =>
        saveRecommendationProfile({
          ...profile,
          preferredGenres: normalizeMetadataList(profile.preferredGenres),
          preferredTags: normalizeMetadataList(profile.preferredTags),
        }),
      )
    },
    resetRecommendationProfile: async (purpose) => {
      await mutation(() => resetRecommendationProfile(purpose))
    },
    setRecommendationFeedback: async (purpose, trackId, affinity) => {
      const id = `${purpose}:${trackId}`
      await mutation(() =>
        affinity
          ? saveRecommendationFeedback({
              id,
              purpose,
              trackId,
              affinity,
              updatedAt: Date.now(),
            })
          : removeRecommendationFeedback(id),
      )
    },
    setTrackExcluded: async (trackId, excluded) => {
      const ids = new Set(recommendationSettings.excludedTrackIds)
      if (excluded) ids.add(trackId)
      else ids.delete(trackId)
      await mutation(() =>
        saveRecommendationSettings({
          ...recommendationSettings,
          excludedTrackIds: [...ids],
        }),
      )
    },
    refreshRecommendations: async (purpose) => {
      await mutation(() =>
        saveRecommendationSettings({
          ...recommendationSettings,
          refreshSeeds: {
            ...recommendationSettings.refreshSeeds,
            [purpose]: (recommendationSettings.refreshSeeds[purpose] || 0) + 1,
          },
        }),
      )
    },
    saveTrackOffline: async (track) => {
      await mutation(async () => {
        const source = await (await database()).get("sources", track.id)
        if (!source)
          throw new Error("Relink this track before saving it offline.")
        await saveOfflineCopy(track.id, await resolveSource(source, true))
      })
      notify(`“${track.title}” is saved for offline playback.`)
    },
    removeTrackOffline: async (track) => {
      await mutation(() => removeOfflineCopy(track.id))
      notify(`Offline copy removed for “${track.title}”.`)
    },
  }
  return <Context.Provider value={state}>{children}</Context.Provider>
}
export function useAura() {
  const state = useContext(Context)
  if (!state) throw new Error("AURA provider is required")
  return state
}
export function usePlayer() {
  return useSyncExternalStore(player.subscribe, player.snapshot)
}
