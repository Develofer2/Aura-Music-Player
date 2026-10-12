/** Top-right canvas style picker for the listening canvas. Copyright (c) 2026 Develofer2. MIT License. */
import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, CircleHelp } from "lucide-react"
import { useAura } from "../state"
import { canvasModes } from "./ListeningVisual"

export default function CanvasPicker({ onGuide }: { onGuide: () => void }) {
  const aura = useAura(),
    box = useRef<HTMLDivElement>(null),
    [open, setOpen] = useState(false)
  const current =
    canvasModes.find((m) => m.mode === aura.prefs.mode) || canvasModes[0]
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape, true)
    return () => {
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", escape, true)
    }
  }, [open])
  return (
    <div className="canvas-corner" ref={box}>
      <button
        type="button"
        className="canvas-guide-button"
        aria-label="Open the AURA guide"
        title="How AURA works"
        onClick={onGuide}
      >
        <CircleHelp size={16} />
        <span>Guide</span>
      </button>
      <button
        type="button"
        className="canvas-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change how your music looks"
        onClick={() => setOpen(!open)}
      >
        <current.icon size={16} />
        <span className="canvas-picker-text">
          <strong>{current.name}</strong>
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="canvas-picker-menu" role="listbox" aria-label="Canvas style">
          <p>Pick how your music looks while it plays.</p>
          <div className="canvas-picker-grid">
            {canvasModes.map((item) => (
              <button
                type="button"
                role="option"
                key={item.mode}
                aria-selected={item.mode === current.mode}
                className={item.mode === current.mode ? "selected" : ""}
                onClick={() => {
                  void aura.preferences({ mode: item.mode })
                  setOpen(false)
                }}
              >
                <item.icon size={18} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </span>
                {item.mode === current.mode && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
