/** Sound studio: equaliser, presets and studio effects for the playback chain. Copyright (c) 2026 Develofer2. MIT License. */
import { RotateCcw } from "lucide-react"
import { Button, Heading, Modal, Slider } from "./ui"
import { useAura } from "../state"
import {
  applyPreset,
  bandLabels,
  flat,
  normalise,
  presets,
  type AudioSettings,
} from "../audioFx"
const db = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)} dB`
const pct = (n: number) => `${Math.round(n * 100)}%`
export default function SoundStudio({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const aura = useAura(),
    fx = normalise(aura.prefs.audio)
  const change = (patch: Partial<AudioSettings>) =>
    void aura.preferences({
      audio: { ...fx, ...patch, preset: patch.preset ?? "Custom" },
    })
  const row = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    show: (n: number) => string,
    set: (n: number) => void,
  ) => (
    <label className="fx-row" key={label}>
      <span>{label}</span>
      <Slider
        label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={!fx.enabled}
        onChange={(e) => set(Number(e.target.value))}
      />
      <output>{show(value)}</output>
    </label>
  )
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sound studio"
      description="Shape how your music sounds. Applied live, saved on this device."
      className="sound-modal"
    >
      <div className="sound-studio">
        <div className="fx-head">
          <label className="fx-toggle">
            <input
              type="checkbox"
              checked={fx.enabled}
              onChange={(e) => change({ enabled: e.target.checked, preset: fx.preset })}
            />
            <span>Enhancements {fx.enabled ? "on" : "off"}</span>
          </label>
          <Button
            variant="ghost"
            onClick={() => void aura.preferences({ audio: { ...flat, enabled: fx.enabled } })}
          >
            <RotateCcw size={16} />
            Reset
          </Button>
        </div>
        <Heading level={3}>Presets</Heading>
        <div className="fx-presets" role="group" aria-label="Sound presets">
          {Object.keys(presets).map((name) => (
            <Button
              key={name}
              variant={fx.preset === name ? "primary" : "secondary"}
              aria-pressed={fx.preset === name}
              disabled={!fx.enabled}
              onClick={() =>
                void aura.preferences({ audio: applyPreset(name, fx) })
              }
            >
              {name}
            </Button>
          ))}
        </div>
        <Heading level={3}>Equaliser</Heading>
        {bandLabels.map((l, i) =>
          row(l, fx.bands[i], -12, 12, 0.5, db, (n) =>
            change({ bands: fx.bands.map((b, j) => (j === i ? n : b)) }),
          ),
        )}
        <Heading level={3}>Tone and space</Heading>
        {row("Preamp", fx.preamp, -12, 6, 0.5, db, (n) => change({ preamp: n }))}
        {row("Bass", fx.bass, -8, 8, 0.5, db, (n) => change({ bass: n }))}
        {row("Treble", fx.treble, -8, 8, 0.5, db, (n) => change({ treble: n }))}
        {row("Studio room", fx.room, 0, 1, 0.01, pct, (n) => change({ room: n }))}
        {row("Stereo width", fx.width, 0, 1, 0.01, pct, (n) => change({ width: n }))}
        <label className="fx-toggle">
          <input
            type="checkbox"
            checked={fx.loudness}
            disabled={!fx.enabled}
            onChange={(e) => change({ loudness: e.target.checked })}
          />
          <span>Loudness leveller (evens out quiet and loud parts)</span>
        </label>
      </div>
    </Modal>
  )
}
