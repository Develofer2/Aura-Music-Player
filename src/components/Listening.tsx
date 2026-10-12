/** Mini player, Now Playing view and queue panel. Copyright (c) 2026 Develofer2. MIT License. */
import { useLayoutEffect, useState } from "react"
import {
  SlidersHorizontal,
  Heart,
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  X,
  Music2,
  Clock3,
} from "lucide-react"
import {
  Artwork,
  Button,
  Field,
  Heading,
  IconButton,
  Modal,
  Select,
  Slider,
} from "./ui"
import { useAura, usePlayer } from "../state"
import { player } from "../playback"
import {
  canvasDefaults,
  canvasModeIds,
  type CanvasMode,
  type CanvasPalette,
} from "../models"
import ListeningVisual, { canvasModes } from "./ListeningVisual"
import CanvasPicker from "./CanvasPicker"
import Guide from "./Guide"
import { formatTime } from "./PlayerArtwork"
export { Record, Atmosphere, formatTime } from "./PlayerArtwork"
function SleepTimer({ compact = false }: { compact?: boolean }) {
  const p = usePlayer()
  const [open, setOpen] = useState(false)
  const active = !!p.sleepEndsAt || !!p.sleepAfterTrack
  const label = p.sleepAfterTrack
    ? "Sleep timer: end of track"
    : p.sleepEndsAt
      ? `Sleep timer: about ${Math.max(1, Math.ceil((p.sleepEndsAt - Date.now()) / 60_000))} minutes`
      : "Set sleep timer"
  return (
    <>
      {compact ? (
        <IconButton
          label={label}
          className={active ? "active" : ""}
          onClick={() => setOpen(true)}
        >
          <Clock3 size={18} />
        </IconButton>
      ) : (
        <Button
          variant="ghost"
          className={active ? "active" : ""}
          onClick={() => setOpen(true)}
        >
          <Clock3 size={18} />
          {active ? label.replace("Sleep timer: ", "") : "Sleep timer"}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Sleep timer"
        description="AURA will stop playback quietly at the time you choose."
      >
        <div className="sleep-options">
          {[15, 30, 45, 60].map((minutes) => (
            <Button
              key={minutes}
              onClick={() => {
                player.setSleepTimer(minutes)
                setOpen(false)
              }}
            >
              {minutes} minutes
            </Button>
          ))}
          <Button
            disabled={!p.queue.length}
            onClick={() => {
              player.setSleepTimer("track")
              setOpen(false)
            }}
          >
            End of this track
          </Button>
          <Button
            variant="ghost"
            disabled={!active}
            onClick={() => {
              player.clearSleepTimer()
              setOpen(false)
            }}
          >
            Turn timer off
          </Button>
        </div>
      </Modal>
    </>
  )
}
export function Transport({ large = false }: { large?: boolean }) {
  const p = usePlayer(),
    aura = useAura()
  return (
    <div className={`transport ${large ? "large" : ""}`}>
      <IconButton
        label="Shuffle"
        aria-pressed={aura.prefs.shuffle}
        className={aura.prefs.shuffle ? "active" : ""}
        onClick={() => void aura.preferences({ shuffle: !aura.prefs.shuffle })}
      >
        <Shuffle size={17} />
      </IconButton>
      <IconButton
        label="Previous track"
        disabled={!p.queue.length}
        onClick={() => player.previous()}
      >
        <SkipBack size={21} fill="currentColor" />
      </IconButton>
      <Button
        className="play-button"
        variant="primary"
        aria-label={p.playing ? "Pause" : "Play"}
        disabled={!p.queue.length || p.loading}
        onClick={() => void player.toggle()}
      >
        {p.playing ? (
          <Pause size={20} fill="currentColor" />
        ) : (
          <Play size={20} fill="currentColor" />
        )}
      </Button>
      <IconButton
        label="Next track"
        disabled={!p.queue.length}
        onClick={() => void player.next()}
      >
        <SkipForward size={21} fill="currentColor" />
      </IconButton>
      <IconButton
        label={`Repeat: ${aura.prefs.repeat}`}
        className={aura.prefs.repeat !== "off" ? "active" : ""}
        onClick={() =>
          void aura.preferences({
            repeat:
              aura.prefs.repeat === "off"
                ? "all"
                : aura.prefs.repeat === "all"
                  ? "one"
                  : "off",
          })
        }
      >
        {aura.prefs.repeat === "one" ? (
          <Repeat1 size={18} />
        ) : (
          <Repeat size={18} />
        )}
      </IconButton>
    </div>
  )
}
export function Timeline() {
  const p = usePlayer()
  return (
    <div
      className="timeline"
      style={
        {
          "--seek-fill": `${
            p.duration
              ? Math.max(0, Math.min(100, (p.position / p.duration) * 100))
              : 0
          }%`,
        } as React.CSSProperties
      }
    >
      <span>{formatTime(p.position)}</span>
      <Slider
        label="Seek playback"
        min={0}
        max={p.duration || 1}
        step={0.1}
        value={Math.min(p.position, p.duration || 1)}
        disabled={!p.duration}
        onChange={(e) => player.seek(Number(e.target.value))}
      />
      <span>{formatTime(p.duration)}</span>
    </div>
  )
}
export default function MiniPlayer({
  onExpand,
  onQueue,
  onSound,
}: {
  onExpand: () => void
  onQueue: () => void
  onSound: () => void
}) {
  const p = usePlayer(),
    aura = useAura(),
    track = aura.tracks.find((t) => t.id === p.queue[p.index]?.trackId)
  return (
    <footer
      className={`mini-player ${p.playing ? "is-playing" : ""}`}
      style={
        {
          "--playback-progress": `${
            p.duration ? (p.position / p.duration) * 100 : 0
          }%`,
        } as React.CSSProperties
      }
    >
      <div className="mini-track">
        <Button
          variant="ghost"
          className="art-button"
          onClick={onExpand}
          aria-label="Open now playing"
        >
          <Artwork id={track?.id} />
        </Button>
        <Button
          variant="ghost"
          className="truncate mini-info"
          onClick={onExpand}
          aria-label="Open now playing"
        >
          <strong>{track?.title || "Nothing playing. Yet."}</strong>
          <span>{track?.artist || "Your next favorite is waiting."}</span>
        </Button>
        {track && (
          <IconButton
            label={track.favorite ? "Remove favorite" : "Favorite track"}
            className={track.favorite ? "active" : ""}
            onClick={() => void aura.favorite(track)}
          >
            <Heart size={17} fill={track.favorite ? "currentColor" : "none"} />
          </IconButton>
        )}
      </div>
      <div className="mini-controls">
        <Transport />
        <Timeline />
      </div>
      <div className="mini-tools">
        <span
          className={`player-signal ${p.playing ? "playing" : ""}`}
          aria-label={p.playing ? "Playing" : "Paused"}
        >
          <span />
          <span />
          <span />
          <span />
        </span>
        <IconButton
          label={aura.prefs.muted ? "Unmute" : "Mute"}
          onClick={() => void aura.preferences({ muted: !aura.prefs.muted })}
        >
          {aura.prefs.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </IconButton>
        <Slider
          label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={aura.prefs.volume}
          onChange={(e) =>
            void aura.preferences({ volume: Number(e.target.value) })
          }
        />
        <span className="tool-divider" />
        <SleepTimer compact />
        <IconButton label="Open queue" onClick={onQueue}>
          <ListMusic size={20} />
        </IconButton>
        <IconButton label="Sound studio" onClick={onSound}>
          <SlidersHorizontal size={19} />
        </IconButton>
        <IconButton label="Expand player" onClick={onExpand}>
          <Maximize2 size={17} />
        </IconButton>
      </div>
    </footer>
  )
}
export function NowPlaying({
  open,
  onClose,
  onQueue,
  onSound,
}: {
  open: boolean
  onClose: () => void
  onQueue: () => void
  onSound: () => void
}) {
  const aura = useAura(),
    p = usePlayer(),
    track = aura.tracks.find((t) => t.id === p.queue[p.index]?.trackId)
  const mode = aura.prefs.mode
  const [guide, setGuide] = useState(false)
  const canvas ={ ...canvasDefaults, ...aura.prefs.canvas }
  const setCanvas = (patch: Partial<typeof canvas>) =>
    void aura.preferences({ canvas: { ...canvas, ...patch } })
  useLayoutEffect(() => {
    const mini = document.querySelector(".mini-player")?.getBoundingClientRect(),
      root = document.documentElement.style,
      vw = window.innerWidth,
      vh = window.innerHeight
    if (!mini) return
    const width = vw <= 650 ? vw - 20 : Math.min(1080, vw - 64)
    root.setProperty("--canvas-from-x", `${mini.left + mini.width / 2 - vw / 2}px`)
    root.setProperty("--canvas-from-y", `${mini.top + mini.height / 2 - vh / 2}px`)
    root.setProperty("--canvas-from-scale", String(Math.max(0.12, mini.width / width)))
  }, [open])
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Listening canvas"
      description="One track. A whole different place."
      className="listening-modal"
      swipeToClose
    >
      <div className="expanded-player">
        <div className="expanded-visual">
          <div className="expanded-status">
            <span className="pill">
              <span className="status-dot" />
              {p.playing ? "NOW PLAYING" : "LISTENING ROOM"}
            </span>
            <span className="room-edition">AURA / PERSONAL AUDIO</span>
          </div>
          <ListeningVisual large />
          <div className="expanded-mode-label">
            <span>{canvasModes.find((m) => m.mode === mode)?.name}</span>
            <p>{canvasModes.find((m) => m.mode === mode)?.detail}</p>
          </div>
        </div>
        <div className="expanded-controls">
          <details className="canvas-customize">
            <summary>Customize this canvas</summary>
            <label>
              <span>Intensity</span>
              <Slider
                label="Canvas intensity"
                min={0.1}
                max={1}
                step={0.05}
                value={canvas.intensity}
                onChange={(e) => setCanvas({ intensity: Number(e.target.value) })}
              />
            </label>
            <label>
              <span>Speed</span>
              <Slider
                label="Canvas speed"
                min={0.25}
                max={2.5}
                step={0.05}
                value={canvas.speed}
                onChange={(e) => setCanvas({ speed: Number(e.target.value) })}
              />
            </label>
            <label>
              <span>Colours</span>
              <Select
                aria-label="Canvas colours"
                value={canvas.palette}
                onValueChange={(value) =>
                  setCanvas({ palette: value as CanvasPalette })
                }
              >
                <option value="theme">Theme colours</option>
                <option value="cover">Cover-inspired</option>
                <option value="rainbow">Rainbow</option>
              </Select>
            </label>
            <label className="canvas-check">
              <Field
                type="checkbox"
                checked={canvas.showLabels}
                onChange={(e) => setCanvas({ showLabels: e.target.checked })}
              />
              <span>Show captions and labels</span>
            </label>
            <Button
              variant="ghost"
              onClick={() => void aura.preferences({ canvas: canvasDefaults })}
            >
              Reset canvas style
            </Button>
          </details>
          <div className="now-title">
            <span className="eyebrow">
              {track?.album || "YOUR OWN SOUNDTRACK"}
            </span>
            <Heading>{track?.title || "The world can wait."}</Heading>
            <p className="muted">
              {track
                ? `${track.artist} · ${track.album}`
                : "Add your music to the library, then settle in."}
            </p>
          </div>
          <div className="canvas-track-meta">
            <span>
              <span className="status-dot" />
              {p.playing ? "Playing from your device" : "LOCAL AUDIO"}
            </span>
            <span>
              {p.duration ? formatTime(p.duration) : "—"} / {mode.toUpperCase()}
            </span>
          </div>
          <Timeline />
          <Transport large />
          <div className="canvas-tools">
            <SleepTimer compact />
            <IconButton
              label={aura.prefs.muted ? "Unmute" : "Mute"}
              onClick={() =>
                void aura.preferences({ muted: !aura.prefs.muted })
              }
            >
              {aura.prefs.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </IconButton>
            <Slider
              label="Listening canvas volume"
              min={0}
              max={1}
              step={0.01}
              value={aura.prefs.volume}
              onChange={(e) =>
                void aura.preferences({ volume: Number(e.target.value) })
              }
            />
            <Button variant="ghost" onClick={onQueue}>
              <ListMusic size={18} />
              Queue
            </Button>
            <Button variant="ghost" onClick={onSound}>
              <SlidersHorizontal size={18} />
              Sound
            </Button>
          </div>

          {p.error && (
            <p role="alert" className="error-text">
              {p.error}
            </p>
          )}
          <div className="expanded-footer">
            <Heart size={14} />
            <span>No interruptions. No algorithm. Just you.</span>
          </div>
        </div>
      </div>
      <CanvasPicker onGuide={() => setGuide(true)} />
      <Guide open={guide} onClose={() => setGuide(false)} />
    </Modal>
  )
}
export function QueuePanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const aura = useAura(),
    p = usePlayer()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your queue"
      description="Saved between visits. Always resumes paused."
    >
      {!p.queue.length && (
        <div className="empty-small">
          <ListMusic size={40} />
          <Heading>Nothing lined up. Yet.</Heading>
          <p className="muted">
            Play from your library or add a track to the queue.
          </p>
        </div>
      )}
      <div className="queue-list">
        {p.queue.map((entry, i) => {
          const track = aura.tracks.find((t) => t.id === entry.trackId)
          return (
            <div
              className={`queue-row ${i === p.index ? "current" : ""}`}
              key={entry.id}
            >
              <span className="muted">
                {i === p.index ? <Music2 size={16} /> : i + 1}
              </span>
              <Artwork id={track?.id} />
              <Button
                variant="ghost"
                className="queue-title"
                onClick={() => void player.select(i, true)}
              >
                <strong>{track?.title || "Unavailable track"}</strong>
                <span>{track?.artist || "Relink in Library"}</span>
              </Button>
              <div className="row-actions">
                <IconButton
                  label="Move earlier"
                  disabled={i <= p.index + 1}
                  onClick={() => player.move(i, -1)}
                >
                  <ArrowUp size={16} />
                </IconButton>
                <IconButton
                  label="Move later"
                  disabled={i <= p.index || i === p.queue.length - 1}
                  onClick={() => player.move(i, 1)}
                >
                  <ArrowDown size={16} />
                </IconButton>
                <IconButton
                  label="Remove from queue"
                  onClick={() => player.removeEntry(entry.id)}
                >
                  <X size={16} />
                </IconButton>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
