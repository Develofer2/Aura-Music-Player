/** Touch scrubbing for canvas visuals: turn a disc or drag a dial to seek. Copyright (c) 2026 Develofer2. MIT License. */
import { useEffect, useRef, useState } from "react"
import { player } from "../playback"

export const SECONDS_PER_TURN = 12

interface Playhead {
  position: number
  duration: number
}

/** Tracks the playhead and exposes handlers that map pointer movement to seeking. */
export function useScrub({ position, duration }: Playhead) {
  const positionRef = useRef(position)
  const lastPosition = useRef(position)
  const scrub = useRef(false)
  const spinRef = useRef(0)
  const [spin, setSpin] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  positionRef.current = position
  spinRef.current = spin
  useEffect(() => {
    const delta = position - lastPosition.current
    lastPosition.current = position
    if (!scrub.current && Math.abs(delta) > 1.2) setSpin((v) => v + delta * 12)
  }, [position])

  function begin(move: (ev: PointerEvent) => void, e: React.PointerEvent) {
    scrub.current = true
    setScrubbing(true)
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      scrub.current = false
      lastPosition.current = positionRef.current
      setScrubbing(false)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    e.preventDefault()
  }

  /** Rotational scrubbing around the centre of the nearest `.record` or `[data-grip]` element. */
  function grab(e: React.PointerEvent<HTMLElement>) {
    const grip = (e.target as HTMLElement).closest(
      ".record,[data-grip]",
    ) as HTMLElement | null
    if (!grip || !duration || e.button > 0) return
    const box = grip.getBoundingClientRect(),
      cx = box.left + box.width / 2,
      cy = box.top + box.height / 2,
      angle = (ev: { clientX: number; clientY: number }) =>
        (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI
    let prev = angle(e),
      at = positionRef.current
    begin((ev) => {
      let d = angle(ev) - prev
      if (d > 180) d -= 360
      if (d < -180) d += 360
      prev = angle(ev)
      at = Math.max(0, Math.min(duration, at + (d / 360) * SECONDS_PER_TURN))
      setSpin(spinRef.current + d)
      player.seek(at)
    }, e)
  }

  /** Linear scrubbing across the width of the nearest `[data-track]` element. */
  function drag(e: React.PointerEvent<HTMLElement>) {
    const lane = (e.target as HTMLElement).closest(
      "[data-track]",
    ) as HTMLElement | null
    if (!lane || !duration || e.button > 0) return
    const box = lane.getBoundingClientRect(),
      to = (x: number) =>
        player.seek(
          Math.max(0, Math.min(1, (x - box.left) / box.width)) * duration,
        )
    to(e.clientX)
    begin((ev) => to(ev.clientX), e)
  }

  return { spin, scrubbing, grab, drag, positionRef }
}
