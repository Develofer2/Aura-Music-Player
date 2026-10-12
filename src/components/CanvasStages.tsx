/** Extra listening canvas stages: cassette, turntable, equaliser, scope, typography, aurora, radio and orbit. Copyright (c) 2026 Develofer2. MIT License. */
import { useEffect, useRef, type CSSProperties } from "react"
import { player } from "../playback"
import { Artwork } from "./ui"
import { Record, formatTime } from "./PlayerArtwork"
import type { CanvasSettings, Track } from "../models"
import type { useScrub } from "./useScrub"

export interface StageProps {
  track?: Track
  playing: boolean
  position: number
  duration: number
  progress: number
  settings: CanvasSettings
  scrub: ReturnType<typeof useScrub>
}

const hash = (value = "aura") =>
  [...value].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Colour for the i-th element of a visual, following the chosen palette. */
export function paletteColor(
  settings: CanvasSettings,
  seed: string | undefined,
  i: number,
  time: number,
  accent = "var(--accent)",
  secondary = "var(--accent-secondary)",
) {
  if (settings.palette === "rainbow")
    return `hsl(${(i * 18 + time / 20) % 360} 80% 62%)`
  if (settings.palette === "cover")
    return `hsl(${(hash(seed) + i * 14) % 360} 70% 62%)`
  return i % 2 ? secondary : accent
}

function useLive<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

/** Runs a per-frame draw callback; slows to a few frames a second when motion is reduced. */
function useFrame(draw: (time: number, dt: number) => void) {
  const latest = useLive(draw)
  useEffect(() => {
    let raf = 0,
      last = performance.now(),
      stopped = false,
      slow = 0,
      frames = 0
    const loop = (now: number) => {
      if (stopped) return
      const root = document.documentElement
      const reduced = root.classList.contains("reduced-motion")
      if (!reduced || now - last > 250) {
        if (!root.classList.contains("lite") && now - last > 34) slow++
        if (++frames === 90) {
          if (slow > 45) root.classList.add("lite")
          frames = slow = 0
        }
        latest.current(now, Math.min(64, now - last))
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [latest])
}

/** Normalised (0-1) spectrum with `count` bins, or zeros while nothing is playing. */
type Bytes = ReturnType<typeof bufferFor>
function spectrum(count: number, playing: boolean, buffer: Bytes) {
  const a = player.analyser
  const out = new Array<number>(count).fill(0)
  if (!playing || !a) return out
  a.getByteFrequencyData(buffer)
  const usable = Math.floor(buffer.length * 0.7)
  for (let i = 0; i < count; i++) {
    const from = Math.floor((i / count) * usable),
      to = Math.max(from + 1, Math.floor(((i + 1) / count) * usable))
    let sum = 0
    for (let j = from; j < to; j++) sum += buffer[j]
    out[i] = sum / (to - from) / 255
  }
  return out
}

const bufferFor = () => new Uint8Array(player.analyser?.frequencyBinCount || 128)

function useCanvas(canvas: React.RefObject<HTMLCanvasElement | null>) {
  const colors = useRef({ at: 0, accent: "", secondary: "" })
  return () => {
    const el = canvas.current
    const context = el?.getContext("2d")
    if (!el || !context) return undefined
    const ratio = Math.min(devicePixelRatio || 1, 2),
      width = el.clientWidth,
      height = el.clientHeight
    if (!width || !height) return undefined
    if (el.width !== Math.round(width * ratio)) {
      el.width = Math.round(width * ratio)
      el.height = Math.round(height * ratio)
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    const cache = colors.current,
      now = performance.now()
    if (now - cache.at > 1000) {
      const style = getComputedStyle(el)
      cache.at = now
      cache.accent = style.getPropertyValue("--accent").trim() || "#78e3ff"
      cache.secondary =
        style.getPropertyValue("--accent-secondary").trim() || "#a995ff"
    }
    return {
      context,
      width,
      height,
      accent: cache.accent,
      secondary: cache.secondary,
    }
  }
}

export function CassetteStage({ track, position, progress, scrub }: StageProps) {
  const left = 14 + (1 - progress) * 16,
    right = 14 + progress * 16
  return (
    <div className="cassette-stage" data-scrub onPointerDown={scrub.grab}>
      <div className="cassette">
        <div className="cassette-label">
          <strong>{track?.title || "Side A"}</strong>
          <span>{track?.artist || "Your mixtape"}</span>
        </div>
        <div className="cassette-window">
          {[left, right].map((tape, i) => (
            <span
              key={i}
              className="reel"
              data-grip
              style={
                { "--tape": `${tape}px`, rotate: `${scrub.spin}deg` } as CSSProperties
              }
            >
              <i />
            </span>
          ))}
          <span className="cassette-counter">{formatTime(position)}</span>
        </div>
        <div className="cassette-foot">
          <span />
          <span />
        </div>
      </div>
      <span className="visual-caption">Turn a reel to wind the tape.</span>
    </div>
  )
}

export function TurntableStage({ track, playing, progress, scrub }: StageProps) {
  return (
    <div
      className={`turntable-stage ${scrub.scrubbing ? "scrubbing" : ""}`}
      data-scrub
      onPointerDown={scrub.grab}
      style={{ "--seek-rot": `${scrub.spin}deg` } as CSSProperties}
    >
      <div className="platter">
        <Record trackId={track?.id} playing={playing} />
      </div>
      <div
        className="tonearm"
        style={{ rotate: `${-26 + progress * 24}deg` }}
        aria-hidden="true"
      >
        <span />
      </div>
      <span className="visual-caption">Turn the record to scrub the track.</span>
    </div>
  )
}

export function EqualiserStage({ playing, settings, track }: StageProps) {
  const host = useRef<HTMLDivElement>(null),
    live = useLive({ playing, settings, seed: track?.fingerprint }),
    buffer = useRef<Bytes | null>(null),
    peaks = useRef<number[]>([])
  const count = 24
  useFrame((time) => {
    const el = host.current
    if (!el) return
    buffer.current ??= bufferFor()
    const { playing: on, settings: s } = live.current,
      data = spectrum(count, on, buffer.current)
    Array.from(el.children).forEach((child, i) => {
      const bar = child as HTMLElement,
        value = Math.min(1, data[i] * (0.6 + s.intensity)),
        h = 4 + value * 96,
        peak = Math.max((peaks.current[i] ?? 0) - 0.6 * s.speed, h)
      peaks.current[i] = peak
      bar.style.setProperty("--h", `${h}%`)
      bar.style.setProperty("--peak", `${peak}%`)
      bar.style.setProperty(
        "--bar",
        paletteColor(s, live.current.seed, i, time),
      )
    })
  })
  return (
    <div className="eq-stage">
      <div className="eq-bars" ref={host} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <span className="visual-caption">
        {playing ? "Live spectrum" : "Press play to wake the bars."}
      </span>
    </div>
  )
}

export function ScopeStage({ playing, settings, track }: StageProps) {
  const canvas = useRef<HTMLCanvasElement>(null),
    prepare = useCanvas(canvas),
    live = useLive({ playing, settings, seed: track?.fingerprint })
  useFrame((time) => {
    const view = prepare()
    if (!view) return
    const { context, width, height } = view,
      { playing: on, settings: s } = live.current,
      a = player.analyser
    const points = 128,
      samples = new Uint8Array(a?.fftSize || 256)
    if (on && a) a.getByteTimeDomainData(samples)
    context.lineWidth = 2.5
    context.lineJoin = "round"
    context.shadowBlur = 14 * s.intensity
    for (let pass = 0; pass < 2; pass++) {
      const colour = paletteColor(s, live.current.seed, pass, time, view.accent, view.secondary)
      context.strokeStyle = colour
      context.shadowColor = colour
      context.globalAlpha = pass ? 0.45 : 1
      context.beginPath()
      for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * width,
          sample = on && a ? (samples[Math.floor((i / points) * samples.length)] - 128) / 128 : Math.sin(i * 0.12 + (time / 600) * s.speed + pass) * 0.08,
          y = height / 2 + sample * height * 0.42 * (0.4 + s.intensity) * (pass ? 0.7 : 1)
        if (i) context.lineTo(x, y)
        else context.moveTo(x, y)
      }
      context.stroke()
    }
    context.globalAlpha = 1
  })
  return (
    <div className="scope-stage">
      <canvas ref={canvas} aria-hidden="true" />
      <span className="visual-caption">Oscilloscope · the raw waveform</span>
    </div>
  )
}

export function TypographyStage({ track, playing, position, duration, settings }: StageProps) {
  const host = useRef<HTMLDivElement>(null),
    live = useLive({ playing }),
    buffer = useRef<Bytes | null>(null),
    level = useRef(0)
  useFrame(() => {
    const el = host.current
    if (!el) return
    buffer.current ??= bufferFor()
    const bass = spectrum(4, live.current.playing, buffer.current).reduce((a, b) => a + b, 0) / 4
    level.current += (bass - level.current) * 0.25
    el.style.setProperty("--bass", level.current.toFixed(3))
  })
  return (
    <div
      className="type-stage"
      ref={host}
      style={
        {
          "--c0": paletteColor(settings, track?.fingerprint, 0, 0),
          "--c1": paletteColor(settings, track?.fingerprint, 1, 0),
        } as CSSProperties
      }
    >
      <span className="type-time">
        {formatTime(position)} / {formatTime(duration)}
      </span>
      <strong>{track?.title || "Press play"}</strong>
      <span className="type-artist">{track?.artist || "Your music, your words."}</span>
    </div>
  )
}

export function AuroraStage({ track, playing, settings }: StageProps) {
  const host = useRef<HTMLDivElement>(null),
    live = useLive({ playing }),
    buffer = useRef<Bytes | null>(null),
    level = useRef(0)
  useFrame(() => {
    const el = host.current
    if (!el) return
    buffer.current ??= bufferFor()
    const all = spectrum(16, live.current.playing, buffer.current)
    level.current += (all.reduce((a, b) => a + b, 0) / 16 - level.current) * 0.15
    el.style.setProperty("--level", level.current.toFixed(3))
  })
  return (
    <div className="aurora-stage" ref={host}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={
            {
              "--i": i,
              "--blob": paletteColor(settings, track?.fingerprint, i, 0),
            } as CSSProperties
          }
        />
      ))}
      <div className="aurora-art">
        <Artwork id={track?.id} title={track?.title} />
      </div>
      <span className="visual-caption">
        {playing ? "Colour that breathes with the music" : "Waiting for the first note"}
      </span>
    </div>
  )
}

export function RadioStage({ track, progress, duration, scrub }: StageProps) {
  const frequency = (88 + progress * 20).toFixed(1)
  return (
    <div className="radio-stage" data-scrub>
      <div className="radio-body">
        <div className="radio-readout">
          <span>{frequency}</span>
          <small>MHz · FM</small>
        </div>
        <div
          className="radio-dial"
          data-track
          onPointerDown={scrub.drag}
          role="slider"
          aria-label="Tune through the track"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(progress * duration)}
        >
          <div className="radio-scale" />
          <div className="radio-needle" style={{ left: `${progress * 100}%` }} />
        </div>
        <div className="radio-station">
          <strong>{track?.title || "No station"}</strong>
          <span>{track?.artist || "Tune in"}</span>
        </div>
        <div className="radio-grille" aria-hidden="true" />
      </div>
      <span className="visual-caption">Drag the dial to tune through the song.</span>
    </div>
  )
}

interface Particle {
  ring: number
  angle: number
  speed: number
  size: number
  band: number
}

export function OrbitStage({ track, playing, settings }: StageProps) {
  const canvas = useRef<HTMLCanvasElement>(null),
    prepare = useCanvas(canvas),
    live = useLive({ playing, settings, seed: track?.fingerprint }),
    buffer = useRef<Bytes | null>(null),
    particles = useRef<Particle[]>([])
  if (!particles.current.length)
    particles.current = Array.from({ length: 64 }, (_, i) => ({
      ring: 1 + (i % 4),
      angle: (i / 64) * Math.PI * 2 * 4,
      speed: (0.00018 + (i % 4) * 0.00006) * (i % 2 ? 1 : -1),
      size: 1.6 + (i % 3),
      band: i % 8,
    }))
  useFrame((time, dt) => {
    const view = prepare()
    if (!view) return
    const { context, width, height } = view,
      { playing: on, settings: s } = live.current
    buffer.current ??= bufferFor()
    const bands = spectrum(8, on, buffer.current),
      cx = width / 2,
      cy = height / 2,
      unit = Math.min(width, height) / 2
    particles.current.forEach((p, i) => {
      p.angle += p.speed * dt * s.speed * (1 + bands[p.band] * 6 * s.intensity)
      const radius = unit * (0.42 + p.ring * 0.13) * (1 + bands[p.band] * 0.12 * s.intensity)
      context.fillStyle = paletteColor(s, live.current.seed, i, time, view.accent, view.secondary)
      context.globalAlpha = 0.5 + bands[p.band] * 0.5
      context.beginPath()
      context.arc(cx + Math.cos(p.angle) * radius, cy + Math.sin(p.angle) * radius, p.size, 0, Math.PI * 2)
      context.fill()
    })
    context.globalAlpha = 1
  })
  return (
    <div className="orbit-stage">
      <canvas ref={canvas} aria-hidden="true" />
      <div className="orbit-art">
        <Artwork id={track?.id} title={track?.title} />
      </div>
    </div>
  )
}
