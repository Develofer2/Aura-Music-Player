/** Playback engine: one audio element, queue, shuffle/repeat, analyser and listening accounting. Copyright (c) 2026 Develofer2. MIT License. */
import { database, saveEvent } from "./storage"
import { resolveSource, SourceAccessError } from "./importer"
import { AudioChain, normalise } from "./audioFx"
import {
  defaults,
  emptySession,
  type ListeningEvent,
  type Preferences,
  type QueueEntry,
  type Session,
  type Track,
} from "./models"
import { playedInterval, qualifies, addDailyInterval } from "./statistics"
export type PlayerState = Session & {
  playing: boolean
  duration: number
  loading: boolean
  error?: string
  sleepEndsAt?: number
  sleepAfterTrack?: boolean
}
class Playback {
  audio = new Audio()
  state: PlayerState = {
    ...emptySession,
    playing: false,
    duration: 0,
    loading: false,
  }
  preferences = defaults
  tracks: Track[] = []
  listeners = new Set<() => void>()
  onError: (error: string) => void = () => {}
  onStats: () => void = () => {}
  private url?: string
  private generation = 0
  private event?: ListeningEvent
  private lastTime = 0
  private lastClock = performance.now()
  private lastFlush = 0
  private writes: Promise<unknown> = Promise.resolve()
  private canonical: QueueEntry[] = []
  private lastAdd = { trackId: "", at: 0 }
  private sleepTimeout?: number
  analyser?: AnalyserNode
  context?: AudioContext
  chain?: AudioChain
  constructor() {
    this.audio.preload = "metadata"
    this.audio.addEventListener("timeupdate", () => {
      this.accumulate()
      this.patch({ position: this.audio.currentTime })
      if (performance.now() - this.lastFlush > 5000) {
        this.flush()
        this.persist()
        this.lastFlush = performance.now()
      }
    })
    this.audio.addEventListener("durationchange", () => {
      if (Number.isFinite(this.audio.duration))
        this.patch({ duration: this.audio.duration })
    })
    this.audio.addEventListener("play", () => {
      this.lastClock = performance.now()
      this.lastTime = this.audio.currentTime
      this.patch({ playing: true })
    })
    this.audio.addEventListener("pause", () => {
      this.flush()
      this.patch({ playing: false })
      this.persist()
    })
    this.audio.addEventListener("seeking", () => {
      this.lastTime = this.audio.currentTime
      this.lastClock = performance.now()
    })
    this.audio.addEventListener("ended", () => {
      this.flush()
      if (this.state.sleepAfterTrack) {
        this.clearSleepTimer()
        this.stop()
      } else if (this.preferences.repeat === "one")
        void this.select(this.state.index, true)
      else void this.next(true)
    })
    this.audio.addEventListener("error", () => {
      if (!this.audio.src) return
      const error =
        "This audio could not be decoded. Your browser may not support its format. Try relinking a supported file."
      this.patch({ playing: false, loading: false, error })
      this.onError(error)
      void this.markUnavailable(this.state.queue[this.state.index]?.trackId)
      if (this.state.index + 1 < this.state.queue.length)
        void this.select(this.state.index + 1, true)
    })
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.flush()
        this.persist()
      }
    })
    window.addEventListener("pagehide", () => {
      this.flush()
      this.persist()
    })
    const resumeSleepTimer = () => this.resumeSleepTimer()
    window.addEventListener("focus", resumeSleepTimer)
    window.addEventListener("pageshow", resumeSleepTimer)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) resumeSleepTimer()
    })
  }
  private async markUnavailable(id?: string) {
    if (!id) return
    try {
      const db = await database(),
        track = await db.get("tracks", id)
      if (track) {
        await db.put("tracks", { ...track, missing: true })
        this.onStats()
      }
    } catch (e) {
      this.onError(`Could not save file status: ${String(e)}`)
    }
  }
  subscribe = (callback: () => void) => {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }
  snapshot = () => this.state
  patch(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((fn) => fn())
  }
  restore(session: Session) {
    this.patch({ ...session, playing: false })
    this.canonical = [...session.queue]
  }
  setPreferences(p: Preferences) {
    this.preferences = p
    this.audio.volume = p.volume
    this.audio.muted = p.muted
    this.chain?.apply(normalise(p.audio))
  }
  async persist() {
    try {
      const db = await database()
      await db.put(
        "settings",
        {
          queue: this.state.queue,
          index: this.state.index,
          position: this.preferences.rememberPlaybackPosition
            ? this.state.position
            : 0,
        },
        "session",
      )
    } catch (e) {
      this.onError(`Playback state could not be saved: ${String(e)}`)
    }
  }
  private accumulate() {
    const now = performance.now(),
      position = this.audio.currentTime
    if (this.event && this.preferences.trackListeningHistory) {
      const seconds = playedInterval(
        (now - this.lastClock) / 1000,
        position - this.lastTime,
        !this.audio.paused,
        this.audio.seeking,
      )
      this.event.seconds += seconds
      this.event.daily ||= {}
      addDailyInterval(this.event.daily, Date.now(), seconds)
    }
    this.lastClock = now
    this.lastTime = position
    if (
      this.event &&
      !this.event.qualified &&
      qualifies(this.event.seconds, this.audio.duration)
    ) {
      this.event.qualified = true
      this.event.qualifiedAt = Date.now()
      this.flush()
    }
  }
  flush() {
    if (!this.event || !this.preferences.trackListeningHistory) return
    const event = { ...this.event, daily: { ...this.event.daily } }
    this.writes = this.writes
      .then(() => saveEvent(event))
      .then(() => this.onStats())
      .catch((e) =>
        this.onError(`Listening history could not be saved: ${String(e)}`),
      )
  }
  async start(ids: string[], index = 0) {
    const queue = ids.map((trackId) => ({ id: crypto.randomUUID(), trackId }))
    this.canonical = [...queue]
    this.patch({ queue, index, position: 0 })
    if (this.preferences.shuffle) this.shuffle(true)
    await this.select(this.state.index, true)
  }
  async select(
    index: number,
    play: boolean,
    restorePosition = 0,
    attempts = 0,
  ) {
    const entry = this.state.queue[index]
    if (!entry) return
    const generation = ++this.generation
    this.accumulate()
    this.flush()
    this.audio.pause()
    this.event = undefined
    this.patch({
      index,
      position: restorePosition,
      loading: true,
      error: undefined,
    })
    try {
      const db = await database()
      const source = await db.get("sources", entry.trackId)
      if (!source)
        throw new Error(
          "This track needs its audio file. Relink it in your library.",
        )
      const blob = await resolveSource(source)
      if (generation !== this.generation) return
      if (this.url) URL.revokeObjectURL(this.url)
      this.url = URL.createObjectURL(blob)
      this.audio.src = this.url
      this.audio.currentTime = restorePosition
      this.audio.addEventListener(
        "loadedmetadata",
        () => {
          if (generation === this.generation && restorePosition > 0)
            this.audio.currentTime = Math.min(
              restorePosition,
              this.audio.duration,
            )
        },
        { once: true },
      )
      this.event = this.preferences.trackListeningHistory
        ? {
            id: crypto.randomUUID(),
            trackId: entry.trackId,
            started: Date.now(),
            seconds: 0,
            qualified: false,
          }
        : undefined
      this.lastTime = restorePosition
      this.lastClock = performance.now()
      this.patch({ loading: false })
      const track = await db.get("tracks", entry.trackId)
      if (track?.missing) {
        await db.put("tracks", { ...track, missing: false })
        this.onStats()
      }
      if (generation !== this.generation) return
      this.mediaSession()
      if (play) {
        await this.enableAnalysis()
        await this.audio.play()
      }
      this.persist()
    } catch (e) {
      if (generation !== this.generation) return
      const error =
        e instanceof Error ? e.message : "Unable to play this track."
      this.patch({ loading: false, playing: false, error })
      this.onError(error)
      if (
        !(e instanceof DOMException && e.name === "NotAllowedError") &&
        (!(e instanceof SourceAccessError) || e.reason === "missing")
      )
        void this.markUnavailable(entry.trackId)
    }
  }
  async toggle() {
    if (this.state.playing) {
      this.accumulate()
      this.audio.pause()
      return
    }
    if (!this.audio.src || this.state.error)
      return this.select(this.state.index, true, this.state.position)
    try {
      await this.enableAnalysis()
      await this.audio.play()
    } catch (e) {
      this.onError(
        e instanceof Error ? e.message : "Playback needs a user gesture.",
      )
    }
  }
  async next(ended = false) {
    const next = this.state.index + 1
    if (next < this.state.queue.length) return this.select(next, true)
    if (this.preferences.repeat === "all") return this.select(0, true)
    if (ended) {
      this.audio.pause()
      this.patch({ playing: false })
    }
  }
  previous() {
    if (this.audio.currentTime > 3) this.seek(0)
    else if (this.state.index > 0) void this.select(this.state.index - 1, true)
  }
  seek(position: number) {
    this.accumulate()
    this.audio.currentTime = position
    this.lastTime = position
    this.patch({ position })
    this.persist()
  }
  add(trackId: string, next = false) {
    if (
      this.lastAdd.trackId === trackId &&
      performance.now() - this.lastAdd.at < 450
    )
      return
    this.lastAdd = { trackId, at: performance.now() }
    const queue = [...this.state.queue]
    queue.splice(next ? this.state.index + 1 : queue.length, 0, {
      id: crypto.randomUUID(),
      trackId,
    })
    this.canonical = [...queue]
    this.patch({ queue })
    this.persist()
  }
  move(index: number, delta: number) {
    const target = index + delta
    if (
      index <= this.state.index ||
      target <= this.state.index ||
      target >= this.state.queue.length
    )
      return
    const queue = [...this.state.queue]
    ;[queue[index], queue[target]] = [queue[target], queue[index]]
    this.canonical = [...queue]
    this.patch({ queue })
    this.persist()
  }
  removeEntry(id: string) {
    const old = this.state.queue.findIndex((e) => e.id === id)
    const currentIndex = this.state.index,
      wasPlaying = this.state.playing
    const queue = this.state.queue.filter((e) => e.id !== id)
    this.patch({
      queue,
      index:
        old < this.state.index
          ? this.state.index - 1
          : Math.min(this.state.index, Math.max(0, queue.length - 1)),
    })
    this.canonical = [...queue]
    if (old === currentIndex && queue.length)
      void this.select(this.state.index, wasPlaying)
    if (!queue.length) this.stop()
    this.persist()
  }
  shuffle(enabled: boolean) {
    if (!this.state.queue.length) return
    const current = this.state.queue[this.state.index]
    let rest = (enabled ? this.state.queue : this.canonical).filter(
      (e) => e.id !== current.id,
    )
    if (enabled) {
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
    }
    this.patch({ queue: [current, ...rest], index: 0 })
    this.persist()
  }
  stop() {
    ++this.generation
    this.accumulate()
    this.flush()
    this.audio.pause()
    this.audio.removeAttribute("src")
    this.audio.load()
    if (this.url) URL.revokeObjectURL(this.url)
    this.event = undefined
    this.patch({ ...emptySession, playing: false, duration: 0, loading: false })
    this.persist()
  }
  setSleepTimer(minutes?: number | "track") {
    if (this.sleepTimeout) window.clearTimeout(this.sleepTimeout)
    this.sleepTimeout = undefined
    if (minutes === "track") {
      this.patch({ sleepAfterTrack: true, sleepEndsAt: undefined })
      return
    }
    if (!minutes) {
      this.patch({ sleepAfterTrack: false, sleepEndsAt: undefined })
      return
    }
    const sleepEndsAt = Date.now() + minutes * 60_000
    this.patch({ sleepAfterTrack: false, sleepEndsAt })
    this.scheduleSleepTimer()
  }
  private scheduleSleepTimer() {
    if (this.sleepTimeout) window.clearTimeout(this.sleepTimeout)
    this.sleepTimeout = undefined
    if (!this.state.sleepEndsAt) return
    const remaining = this.state.sleepEndsAt - Date.now()
    if (remaining <= 0) {
      this.clearSleepTimer()
      this.stop()
      return
    }
    this.sleepTimeout = window.setTimeout(
      () => {
        this.clearSleepTimer()
        this.stop()
      },
      Math.min(remaining, 2_147_483_647),
    )
  }
  private resumeSleepTimer() {
    if (this.state.sleepEndsAt) this.scheduleSleepTimer()
  }
  clearSleepTimer() {
    if (this.sleepTimeout) window.clearTimeout(this.sleepTimeout)
    this.sleepTimeout = undefined
    this.patch({ sleepAfterTrack: false, sleepEndsAt: undefined })
  }
  forgetCurrentListening() {
    this.event = undefined
    this.lastClock = performance.now()
    this.lastTime = this.audio.currentTime
  }
  async enableAnalysis() {
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.analyser = this.context.createAnalyser()
        this.analyser.fftSize = 256
        this.chain = new AudioChain(this.context)
        this.context
          .createMediaElementSource(this.audio)
          .connect(this.chain.input)
        this.chain.output.connect(this.analyser)
        this.analyser.connect(this.context.destination)
        this.chain.apply(normalise(this.preferences.audio))
      }
      if (this.context.state === "suspended") await this.context.resume()
    } catch {
      /* Playback remains usable on browsers without Web Audio. */
    }
  }
  mediaSession() {
    if (!("mediaSession" in navigator)) return
    const track = this.tracks.find(
      (t) => t.id === this.state.queue[this.state.index]?.trackId,
    )
    if (track)
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
      })
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> =
      {
        play: () => {
          if (!this.state.playing) void this.toggle()
        },
        pause: () => {
          this.accumulate()
          this.audio.pause()
        },
        nexttrack: () => {
          void this.next()
        },
        previoustrack: () => this.previous(),
        seekto: (d) => {
          if (d.seekTime != null) this.seek(d.seekTime)
        },
      }
    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(
          action as MediaSessionAction,
          handler!,
        )
      } catch {
        /* Optional action. */
      }
    })
  }
}
export const player = new Playback()
