/** Friendly guide that explains every part of AURA. Copyright (c) 2026 Develofer2. MIT License. */
import {
  Home,
  Library,
  ListMusic,
  Sparkles,
  ChartNoAxesColumnIncreasing,
  Palette,
  Disc3,
  SlidersHorizontal,
  Plus,
  Search,
  Keyboard,
  ShieldCheck,
} from "lucide-react"
import { Modal } from "./ui"

const sections = [
  {
    icon: Plus,
    title: "Add your music",
    text: "Press the + button at the top, then drop songs or whole folders. Everything stays on this device. Nothing is uploaded.",
  },
  {
    icon: Home,
    title: "Home",
    text: "Your starting point. Press Start listening, see what you added recently and jump into your playlists.",
  },
  {
    icon: Library,
    title: "Your library",
    text: "All your tracks in one place. Search, sort, favorite songs with the heart and edit details from the row menu.",
  },
  {
    icon: ListMusic,
    title: "Playlists",
    text: "Make mixes for any moment. Open a playlist to reorder, rename or play it.",
  },
  {
    icon: Sparkles,
    title: "Mood & discovery",
    text: "Pick a mood or purpose and AURA builds a mix from your own music. You can see why each song was chosen.",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Listening stats",
    text: "Real numbers from your own listening, like minutes played and top tracks. Stored only on this device.",
  },
  {
    icon: Palette,
    title: "Appearance",
    text: "Change the whole look of the app. You can also use the colour button at the top for a quick switch.",
  },
  {
    icon: Disc3,
    title: "Listening canvas",
    text: "Tap the player artwork to open it. Use Canvas style in the top right to switch between artwork, vinyl, CD, waveform and more. Customize this canvas changes speed, intensity and colours.",
  },
  {
    icon: SlidersHorizontal,
    title: "Sound Studio",
    text: "Open Sound from the player to shape your sound with the equaliser, presets, reverb and stereo width.",
  },
  {
    icon: Search,
    title: "Search",
    text: "Type in the top search bar to find any song, artist or album.",
  },
  {
    icon: Keyboard,
    title: "Shortcuts",
    text: "Space plays or pauses. Alt + Arrow keys skip tracks. Ctrl or Cmd + K jumps to search.",
  },
  {
    icon: ShieldCheck,
    title: "Your privacy",
    text: "AURA works offline once installed. Back up your library details from Settings so you never lose your playlists.",
  },
]

export default function Guide({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Welcome to AURA"
      description="A quick tour of everything, in plain words."
      className="guide-modal"
    >
      <ol className="guide-list">
        {sections.map((s) => (
          <li key={s.title}>
            <span className="guide-icon">
              <s.icon size={18} />
            </span>
            <span>
              <strong>{s.title}</strong>
              <small>{s.text}</small>
            </span>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
