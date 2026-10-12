/** Artwork, vinyl and CD renderings for the player. Copyright (c) 2026 Develofer2. MIT License. */
import { useEffect, useRef } from "react"
import { Artwork } from "./ui"
import { useAura } from "../state"
import { player } from "../playback"
export const formatTime = (seconds: number) =>
  Number.isFinite(seconds)
    ? `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0")}`
    : "0:00"
export function Atmosphere({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    aura = useAura()
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    let frame = 0,
      disposed = false
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    let previousFrame = 0
    const reduced = () =>
      aura.prefs.reducedMotion ||
      media.matches ||
      document.documentElement.classList.contains("reduced-motion")
    const context = element.getContext("2d")
    function draw(timestamp = 0) {
      if (disposed || !element?.isConnected || !context) return
      if (timestamp && timestamp - previousFrame < 32) {
        frame = requestAnimationFrame(draw)
        return
      }
      previousFrame = timestamp
      const width = element.clientWidth,
        height = element.clientHeight,
        ratio = Math.min(devicePixelRatio, 2)
      if (!width || !height) return
      element.width = width * ratio
      element.height = height * ratio
      context.scale(ratio, ratio)
      const accent = getComputedStyle(element)
        .getPropertyValue("--accent")
        .trim()
      if (!accent) return
      context.clearRect(0, 0, width, height)
      const data = new Uint8Array(player.analyser?.frequencyBinCount || 128)
      if (active && !document.hidden)
        player.analyser?.getByteFrequencyData(data)
      const secondary =
        getComputedStyle(element)
          .getPropertyValue("--accent-secondary")
          .trim() || accent
      const energy = data.slice(0, 48).reduce((sum, n) => sum + n, 0) / 48 / 255
      const phase = active && !reduced() ? timestamp * 0.00035 : 0
      for (let ribbon = 0; ribbon < 6; ribbon++) {
        const gradient = context.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, ribbon % 2 ? secondary : accent)
        gradient.addColorStop(1, ribbon % 2 ? accent : secondary)
        context.fillStyle = gradient
        context.globalAlpha = 0.12 + energy * 0.16
        context.beginPath()
        for (let x = 0; x <= width; x += 4) {
          const frequency =
            data[Math.min(47, Math.floor((x / width) * 48))] / 255
          const amplitude = height * (0.12 + (active ? frequency * 0.2 : 0))
          const y =
            height * 0.5 +
            Math.sin((x / width) * Math.PI * 2 + ribbon * 0.65 + phase) *
              amplitude +
            (ribbon - 2.5) * height * 0.035
          if (x === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        for (let x = width; x >= 0; x -= 4) {
          const y =
            height * 0.5 +
            Math.sin((x / width) * Math.PI * 2 + ribbon * 0.65 + phase + 0.4) *
              height *
              (0.1 + energy * 0.2) +
            (ribbon - 2.5) * height * 0.035
          context.lineTo(x, y)
        }
        context.closePath()
        context.fill()
        context.globalAlpha = 0.65
        context.strokeStyle = gradient
        context.lineWidth = 0.8
        context.stroke()
      }
      if (active && !reduced() && !document.hidden)
        frame = requestAnimationFrame(draw)
    }
    draw()
    const visibility = () => {
      cancelAnimationFrame(frame)
      draw()
    }
    document.addEventListener("visibilitychange", visibility)
    media.addEventListener("change", visibility)
    const resize = new ResizeObserver(visibility)
    resize.observe(element)
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      document.removeEventListener("visibilitychange", visibility)
      media.removeEventListener("change", visibility)
      resize.disconnect()
    }
  }, [active, aura.prefs.reducedMotion, aura.prefs.theme])
  return (
    <canvas
      ref={canvas}
      className="atmosphere"
      aria-label="Live audio frequency visualization"
    />
  )
}
export function Record({
  playing = false,
  trackId,
  cd = false,
}: {
  playing?: boolean
  trackId?: string
  cd?: boolean
}) {
  return (
    <div
      className={`record ${cd ? "cd" : ""} ${playing ? "spinning" : "resting"}`}
    >
      <div className="record-grooves" />
      <div className="record-label">
        <Artwork id={trackId} />
        <div className="record-hole" />
      </div>
    </div>
  )
}
export default Record
