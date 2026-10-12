/** Home page: current track, recent and top music. Copyright (c) 2026 Develofer2. MIT License. */
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Disc3,
  Heart,
  Headphones,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Artwork, Button, Heading, IconButton } from "../components/ui"
import { formatTime } from "../components/Listening"
import ListeningVisual, { canvasModes } from "../components/ListeningVisual"
import { useAura, usePlayer } from "../state"
import { player } from "../playback"
import type { Track } from "../models"
import TrackList from "../components/TrackList"
export default function Home({
  navigate,
  onImport,
  onRelink,
  onExpand,
}: {
  navigate: (page: string) => void
  onImport: () => void
  onRelink: (track: Track) => void
  onExpand: () => void
}) {
  const aura = useAura(),
    p = usePlayer()
  const recent = [...aura.tracks].sort((a, b) => b.added - a.added).slice(0, 4)
  const track = aura.tracks.find((t) => t.id === p.queue[p.index]?.trackId)
  const totalSeconds = aura.events.reduce((sum, e) => sum + e.seconds, 0)
  const hour = new Date().getHours(),
    greeting =
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const mode = canvasModes.find((m) => m.mode === aura.prefs.mode)!
  return (
    <div className="page home-page">
      <div className="section-heading room-heading">
        <div>
          <Heading level={1}>
            Your listening room
            <span className="heading-star">
              <Sparkles size={23} strokeWidth={1.3} />
            </span>
          </Heading>
          <p className="muted">{greeting}. Put something good on.</p>
        </div>
        <Button className="room-import" onClick={onImport}>
          <Plus size={17} />
          Import music
        </Button>
      </div>
      <div className="room-grid">
        <section className="sound-room">
          <div className="room-hero">
            <div className="room-copy">
              <Heading level={2}>
                Sound on.
                <br />
                <span>World off.</span>
              </Heading>
              <p>Your music, your way.</p>
              <div className="hero-actions">
                <Button
                  variant="primary"
                  onClick={
                    aura.tracks.length
                      ? () => {
                          void player.start(aura.tracks.map((t) => t.id))
                          onExpand()
                        }
                      : onImport
                  }
                >
                  {aura.tracks.length ? (
                    <Headphones size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  {aura.tracks.length ? "Start listening" : "Import your music"}
                  <ArrowUpRight size={17} />
                </Button>
              </div>
            </div>
            <div className="room-deck">
              <ListeningVisual />
              <div className="deck-info">
                <span className="deck-mode">{mode.name.toUpperCase()}</span>
                <span>
                  {track ? formatTime(p.position) : "00:00"}
                  <small> / {track ? formatTime(p.duration) : "00:00"}</small>
                </span>
              </div>
            </div>
          </div>
          <div className="room-bottom">
            <div className="deck-track">
              <span className={`deck-status ${p.playing ? "playing" : ""}`}>
                <AudioLines size={18} />
              </span>
              <div>
                <strong>{track?.title || "Ready when you are"}</strong>
                <span>
                  {track?.artist || "Add your music. Make this yours."}
                </span>
              </div>
            </div>
            <Button variant="ghost" className="canvas-link" onClick={onExpand}>
              Open listening canvas
              <ArrowUpRight size={15} />
            </Button>
          </div>
        </section>
        <aside className="room-rail">
          <section className="session-panel">
            <div className="section-heading">
              <span className="eyebrow">YOUR COLLECTION</span>
            </div>
            <div className="session-numbers">
              <div>
                <strong>{aura.tracks.length}</strong>
                <span>tracks</span>
              </div>
              <div>
                <strong>{aura.playlists.length}</strong>
                <span>playlists</span>
              </div>
              <div>
                <strong>{Math.floor(totalSeconds / 60)}</strong>
                <span>minutes played</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
      <div className="collection-grid">
        <section className="library-panel">
          <div className="section-heading">
            <div>
              <Heading level={2}>
                {recent.length
                  ? "Fresh in your collection"
                  : "A little room for your music"}
              </Heading>
            </div>
            <Button variant="ghost" onClick={() => navigate("library")}>
              Your library
              <ArrowUpRight size={16} />
            </Button>
          </div>
          {recent.length ? (
            <TrackList tracks={recent} onRelink={onRelink} />
          ) : (
            <Button
              variant="ghost"
              className="collection-drop"
              onClick={onImport}
            >
              <div className="stacked-covers" aria-hidden="true">
                <div />
                <div />
                <div>
                  <AudioLines size={30} />
                </div>
              </div>
              <div>
                <strong>Bring your favorites along.</strong>
                <p>
                  Import MP3, FLAC, WAV & more.
                  <br />
                  Saved here. Never uploaded.
                </p>
                <span>
                  Choose your files
                  <ArrowRight size={14} />
                </span>
              </div>
              <span className="drop-plus">
                <Plus size={24} strokeWidth={1.2} />
              </span>
            </Button>
          )}
        </section>
        <section className="playlist-panel">
          <div className="section-heading">
            <div>
              <Heading level={2}>For a certain feeling</Heading>
            </div>
            <IconButton
              label="Create a playlist"
              onClick={() => navigate("playlists")}
            >
              <Plus size={19} />
            </IconButton>
          </div>
          {aura.playlists.length ? (
            aura.playlists.slice(0, 2).map((list) => (
              <Button
                variant="ghost"
                className="playlist-mini"
                key={list.id}
                onClick={() => navigate(`playlist/${list.id}`)}
              >
                <Artwork id={list.coverId || list.tracks[0]} />
                <span>
                  <strong>{list.name}</strong>
                  <small>{list.tracks.length} tracks</small>
                </span>
                <ArrowUpRight size={16} />
              </Button>
            ))
          ) : (
            <div className="playlist-start">
              <div className="mixtape" aria-hidden="true">
                <div className="tape-label">
                  <span>AURA / SIDE A</span>
                  <Heart size={14} />
                </div>
                <div className="tape-reels">
                  <span />
                  <div />
                  <span />
                </div>
                <div className="tape-bottom" />
              </div>
              <p>
                Long drives. Late nights.
                <br />
                What does your first mix sound like?
              </p>
              <Button variant="ghost" onClick={() => navigate("playlists")}>
                Make a playlist
                <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </section>
      </div>
      {!!aura.tracks.length && (
        <section>
          <div className="section-heading">
            <Heading>On your frequency</Heading>
          </div>
          <div className="quick-mixes">
            {[
              {
                name: "Your favorites",
                icon: Heart,
                tracks: aura.tracks.filter((t) => t.favorite),
              },
              {
                name: "On repeat",
                icon: Headphones,
                tracks: [...aura.tracks]
                  .filter((t) => t.plays)
                  .sort((a, b) => b.plays - a.plays),
              },
              { name: "Fresh finds", icon: Disc3, tracks: recent },
            ].map((m) => (
              <Button
                key={m.name}
                onClick={() => void player.start(m.tracks.map((t) => t.id))}
                disabled={!m.tracks.length}
              >
                <m.icon size={18} />
                {m.name}
                <span className="muted">{m.tracks.length} tracks</span>
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
