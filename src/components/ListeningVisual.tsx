/** Now Playing visual modes, including the audio-reactive waveform. Copyright (c) 2026 Develofer2. MIT License. */
import { useEffect, useRef } from "react"
import { player } from "../playback"
import {
  AudioLines,
  ChartNoAxesColumnIncreasing,
  Disc3,
  Image,
  Music2,
  Palette,
  Radio,
  Waves,
} from "lucide-react"
import { useScrub } from "./useScrub"
import {
  AuroraStage,
  CassetteStage,
  EqualiserStage,
  OrbitStage,
  RadioStage,
  ScopeStage,
  TurntableStage,
  TypographyStage,
} from "./CanvasStages"
import { Artwork, Button } from "./ui"
import { Record, Atmosphere, formatTime } from "./PlayerArtwork"
import { useAura, usePlayer } from "../state"
import { canvasDefaults, type CanvasMode } from "../models"
export const canvasModes = [
  {
    mode: "Artwork" as CanvasMode,
    name: "Artwork",
    icon: Image,
    detail: "Let the cover tell the story.",
  },
  {
    mode: "Vinyl" as CanvasMode,
    name: "Vinyl soul",
    icon: Disc3,
    detail: "A classic, reimagined.",
  },
  {
    mode: "CD" as CanvasMode,
    name: "Holo CD",
    icon: Disc3,
    detail: "A little nostalgia. A new dimension.",
  },
  {
    mode: "Progress" as CanvasMode,
    name: "Waveform",
    icon: Waves,
    detail: "Your place in the music.",
  },
  {
    mode: "Atmosphere" as CanvasMode,
    name: "Atmosphere",
    icon: Radio,
    detail: "Feel the frequencies.",
  },
  {
    mode: "Cassette" as CanvasMode,
    name: "Cassette",
    icon: Music2,
    detail: "Wind the tape by hand.",
  },
  {
    mode: "Turntable" as CanvasMode,
    name: "Turntable deck",
    icon: Disc3,
    detail: "Platter, tonearm and a steady needle.",
  },
  {
    mode: "Equaliser" as CanvasMode,
    name: "Equaliser",
    icon: ChartNoAxesColumnIncreasing,
    detail: "Bars with peak caps, live.",
  },
  {
    mode: "Scope" as CanvasMode,
    name: "Oscilloscope",
    icon: AudioLines,
    detail: "The raw waveform, glowing.",
  },
  {
    mode: "Typography" as CanvasMode,
    name: "Type focus",
    icon: Image,
    detail: "Big words that pulse with the bass.",
  },
  {
    mode: "Aurora" as CanvasMode,
    name: "Aurora",
    icon: Palette,
    detail: "Soft colour that breathes.",
  },
  {
    mode: "Radio" as CanvasMode,
    name: "Radio dial",
    icon: Radio,
    detail: "Tune through the song.",
  },
  {
    mode: "Orbit" as CanvasMode,
    name: "Orbit",
    icon: Waves,
    detail: "Light circling your cover art.",
  },
]
export function ModeTabs({ compact = false }: { compact?: boolean }) {
  const aura = useAura()
  return (
    <div
      className={`mode-tabs ${compact ? "compact" : ""}`}
      role="group"
      aria-label="Listening display modes"
    >
      {canvasModes.map((item) => (
        <Button
          key={item.mode}
          variant="ghost"
          aria-pressed={aura.prefs.mode === item.mode}
          className={aura.prefs.mode === item.mode ? "selected" : ""}
          onClick={() => void aura.preferences({ mode: item.mode })}
        >
          <item.icon size={16} />
          <span>{item.name}</span>
        </Button>
      ))}
    </div>
  )
}
export function ProgressRing({ progress = 0 }: { progress?: number }) {
  const radius = 144,
    circumference = Math.PI * radius * 2
  return (
    <svg className="hud-ring" viewBox="0 0 320 320" aria-hidden="true">
      {Array.from({ length: 80 }, (_, i) => {
        const angle = (i / 80) * Math.PI * 2
        return (
          <line
            key={i}
            className={i % 5 === 0 ? "major-tick" : ""}
            x1={160 + Math.cos(angle) * 153}
            y1={160 + Math.sin(angle) * 153}
            x2={160 + Math.cos(angle) * (i % 5 === 0 ? 148 : 151)}
            y2={160 + Math.sin(angle) * (i % 5 === 0 ? 148 : 151)}
          />
        )
      })}
      <circle className="ring-track" cx="160" cy="160" r={radius} />
      <circle
        className="ring-progress"
        cx="160"
        cy="160"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={
          circumference * (1 - Math.max(0, Math.min(1, progress)))
        }
        transform="rotate(-90 160 160)"
      />
    </svg>
  )
}
interface VisualProps {
  mode?: CanvasMode
  large?: boolean
}
export default function ListeningVisual({ mode, large = false }: VisualProps) {
  const aura = useAura(),
    p = usePlayer()
  const track = aura.tracks.find((t) => t.id === p.queue[p.index]?.trackId)
  const selected = mode || aura.prefs.mode
  const progress = p.duration ? p.position / p.duration : 0
  const bars = useRef<HTMLDivElement>(null)
  const scrub = useScrub(p)
  const { positionRef, spin, scrubbing, grab } = scrub
  const settings = { ...canvasDefaults, ...aura.prefs.canvas }
  const stage = {
    track,
    playing: p.playing,
    position: p.position,
    duration: p.duration,
    progress,
    settings,
    scrub,
  }
  useEffect(() => {
    const el = bars.current
    if (selected !== "Progress" || !el) return
    const spans = Array.from(el.children) as HTMLElement[]
    const shape = (phase: number) =>
      spans.map((_, i) => 12 + 75 * Math.abs(Math.sin(i * 0.22 + phase) * Math.cos(i * 0.08 + phase * 0.5)))
    let phase = positionRef.current * 0.5,
      base = shape(phase),
      raf = 0
    const data = new Uint8Array(player.analyser?.frequencyBinCount || 128)
    const tick = () => {
      const target = positionRef.current * 0.5
      if (Math.abs(target - phase) > 0.001) {
        phase += (target - phase) * 0.18
        base = shape(phase)
      }
      const a = player.analyser
      if (p.playing && a) {
        a.getByteFrequencyData(data)
        const usable = Math.floor(data.length * 0.7)
        spans.forEach((s, i) => {
          const v = data[Math.floor((i / spans.length) * usable)] / 255
          s.style.height = `${Math.min(100, 10 + v * 90 * (0.55 + base[i] / 200))}%`
        })
      } else spans.forEach((s, i) => (s.style.height = `${base[i]}%`))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [selected, p.playing])
  return (
    <div
      className={`listening-visual visual-${selected.toLowerCase()} ${
        large ? "visual-large" : ""
      } ${p.playing ? "is-playing" : ""} ${settings.showLabels ? "" : "labels-off"}`}
      style={
        {
          "--canvas-intensity": settings.intensity,
          "--canvas-speed": settings.speed,
        } as React.CSSProperties
      }
    >
      <div className="visual-halo" />
      {selected === "Cassette" && <CassetteStage {...stage} />}
      {selected === "Turntable" && <TurntableStage {...stage} />}
      {selected === "Equaliser" && <EqualiserStage {...stage} />}
      {selected === "Scope" && <ScopeStage {...stage} />}
      {selected === "Typography" && <TypographyStage {...stage} />}
      {selected === "Aurora" && <AuroraStage {...stage} />}
      {selected === "Radio" && <RadioStage {...stage} />}
      {selected === "Orbit" && <OrbitStage {...stage} />}
      {(selected === "Vinyl" || selected === "CD") && (
        <div
          className={`disc-stage ${scrubbing ? "scrubbing" : ""}`}
          onPointerDown={grab}
          data-scrub
          style={{ "--seek-rot": `${spin}deg` } as React.CSSProperties}
        >
          <ProgressRing progress={progress} />
          <Record
            trackId={track?.id}
            playing={p.playing}
            cd={selected === "CD"}
          />
          <span className="disc-marker marker-top">
            AURA / {selected === "CD" ? "DIGITAL EDITION" : "33⅓"}
          </span>
          <span className="disc-marker marker-bottom">
            {p.playing ? "IN ROTATION" : "READY TO PLAY"}
          </span>
        </div>
      )}
      {selected === "Artwork" && (
        <div className="artwork-stage">
          <div className="artwork-backplate" />
          <Artwork id={track?.id} title={track?.title} />
          <span className="artwork-caption">
            {track?.album || "Your collection, front and center."}
          </span>
        </div>
      )}
      {selected === "Atmosphere" && (
        <div className="ribbon-stage">
          <Atmosphere active={p.playing} />
          <span className="visual-caption">
            {p.playing
              ? "Live audio frequencies"
              : "Ambient preview · reacts when you play"}
          </span>
        </div>
      )}
      {selected === "Progress" && (
        <div className="wave-stage">
          <div className="progress-bars" aria-hidden="true" ref={bars}>
            {Array.from({ length: 64 }, (_, i) => (
              <span
                key={i}
                className={i / 64 < progress ? "passed" : ""}
                style={
                  {
                    "--bar-height": `${12 + 75 * Math.abs(Math.sin(i * 0.22) * Math.cos(i * 0.08))}%`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div className="wave-readout">
            <span>{formatTime(p.position)}</span>
            <AudioLines size={20} />
            <span>{formatTime(p.duration)}</span>
          </div>
          <span className="visual-caption">
            Live waveform · moves with your music
          </span>
        </div>
      )}
    </div>
  )
}
