/** Track list/grid with play, favorite, queue, playlist and edit actions. Copyright (c) 2026 Develofer2. MIT License. */
import { useEffect, useState } from "react"
import {
  Heart,
  Play,
  Plus,
  MoreHorizontal,
  Link2,
  Trash2,
  ListPlus,
  ArrowUp,
  ArrowDown,
  X,
  Pencil,
  Download,
  HardDrive,
} from "lucide-react"
import {
  Artwork,
  Button,
  Field,
  Heading,
  IconButton,
  Modal,
  Select,
} from "./ui"
import { useAura, usePlayer } from "../state"
import { player } from "../playback"
import { isSafeImage } from "../security"
import { formatTime } from "./Listening"
import type { Playlist, Track } from "../models"
import { canRemoveOfflineCopy, trackAvailability } from "../storage"
export default function TrackList({
  tracks,
  onRelink,
  grid = false,
  playlist,
}: {
  tracks: Track[]
  onRelink: (track: Track) => void
  grid?: boolean
  playlist?: Playlist
}) {
  const aura = useAura(),
    p = usePlayer()
  const [editing, setEditing] = useState<Track>(),
    [draft, setDraft] = useState({
      title: "",
      artist: "",
      album: "",
      genres: "",
      moodTags: "",
    }),
    [art, setArt] = useState<Blob | null | undefined>(),
    [artPreview, setArtPreview] = useState<string>()
  function openEdit(t: Track) {
    setDraft({
      title: t.title,
      artist: t.artist,
      album: t.album,
      genres: (t.genres || []).join(", "),
      moodTags: (t.moodTags || []).join(", "),
    })
    setArt(undefined)
    setArtPreview(undefined)
    setEditing(t)
  }
  const [menu, setMenu] = useState<Track>(),
    [playlistId, setPlaylistId] = useState(""),
    [availability, setAvailability] =
      useState<"stored" | "original" | "permission-required" | "missing">(),
    [canRemoveCopy, setCanRemoveCopy] = useState(false)
  useEffect(() => {
    if (!menu) {
      setAvailability(undefined)
      setCanRemoveCopy(false)
      return
    }
    void Promise.all([
      trackAvailability(menu.id),
      canRemoveOfflineCopy(menu.id),
    ]).then(([nextAvailability, removable]) => {
      setAvailability(nextAvailability)
      setCanRemoveCopy(removable)
    })
  }, [menu])
  async function move(index: number, direction: number) {
    if (
      !playlist ||
      index + direction < 0 ||
      index + direction >= playlist.tracks.length
    )
      return
    const ids = [...playlist.tracks]
    ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
    await aura.playlist({ ...playlist, tracks: ids })
  }
  return (
    <>
      <div className={grid ? "track-grid" : "track-list"}>
        {!grid && (
          <div className={`track-header ${playlist ? "playlist-track" : ""}`}>
            <span>#</span>
            <span>TRACK</span>
            <span>ALBUM</span>
            <span>TIME</span>
            <span />
          </div>
        )}
        {tracks.map((track, i) => (
          <div
            className={`track-row ${playlist ? "playlist-track" : ""} ${
              p.queue[p.index]?.trackId === track.id ? "current" : ""
            }`}
            key={`${track.id}-${i}`}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest(".row-actions, button, a"))
                return
              void player.start(
                tracks.map((t) => t.id),
                i,
              )
            }}
          >
            <Button
              className="track-play"
              variant="ghost"
              aria-label={`Play ${track.title}`}
              onClick={() =>
                void player.start(
                  tracks.map((t) => t.id),
                  i,
                )
              }
            >
              <span className="track-number">{i + 1}</span>
              <Play size={16} fill="currentColor" />
            </Button>
            <div className="track-info">
              <Artwork id={track.id} title={track.title} />
              <Button
                variant="ghost"
                className="track-title"
                onClick={() =>
                  void player.start(
                    tracks.map((t) => t.id),
                    i,
                  )
                }
              >
                <strong>{track.title}</strong>
                <span>{track.missing ? "Relink required" : track.artist}</span>
              </Button>
            </div>
            <span className="track-album muted">{track.album}</span>
            <span className="track-time muted">
              {formatTime(track.duration)}
            </span>
            <div className="row-actions">
              <IconButton
                label={`Favorite ${track.title}`}
                className={track.favorite ? "active" : ""}
                onClick={() => void aura.favorite(track)}
              >
                <Heart
                  size={16}
                  fill={track.favorite ? "currentColor" : "none"}
                />
              </IconButton>
              <IconButton
                label={`Options for ${track.title}`}
                onClick={() => {
                  setMenu(track)
                  setPlaylistId(aura.playlists[0]?.id || "")
                }}
              >
                <MoreHorizontal size={18} />
              </IconButton>
              {playlist && (
                <>
                  <IconButton
                    label="Move track up"
                    onClick={() => void move(i, -1)}
                    disabled={!i}
                  >
                    <ArrowUp size={15} />
                  </IconButton>
                  <IconButton
                    label="Move track down"
                    onClick={() => void move(i, 1)}
                    disabled={i === tracks.length - 1}
                  >
                    <ArrowDown size={15} />
                  </IconButton>
                  <IconButton
                    label="Remove from playlist"
                    onClick={() =>
                      void aura.playlist({
                        ...playlist,
                        tracks: playlist.tracks.filter(
                          (_, index) => index !== i,
                        ),
                      })
                    }
                  >
                    <X size={15} />
                  </IconButton>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <Modal
        open={!!menu}
        onClose={() => setMenu(undefined)}
        title={menu?.title || "Track options"}
        description={menu ? `${menu.artist} · ${menu.album}` : undefined}
      >
        {menu && (
          <div className="track-menu">
            <Button
              onClick={() => {
                player.add(menu.id)
                aura.notify("Added to your queue")
                setMenu(undefined)
              }}
            >
              <Plus size={17} />
              Add to queue
            </Button>
            <Button
              onClick={() => {
                player.add(menu.id, true)
                aura.notify("Playing next")
                setMenu(undefined)
              }}
            >
              <ListPlus size={17} />
              Play next
            </Button>
            {!!aura.playlists.length && (
              <div className="form-row">
                <Select
                  aria-label="Playlist"
                  value={playlistId}
                  onValueChange={setPlaylistId}
                >
                  {aura.playlists.map((list) => (
                    <option value={list.id} key={list.id}>
                      {list.name}
                    </option>
                  ))}
                </Select>
                <Button
                  onClick={() => {
                    const list = aura.playlists.find((t) => t.id === playlistId)
                    if (list)
                      void aura.playlist({
                        ...list,
                        tracks: [...list.tracks, menu.id],
                      })
                    aura.notify("Added to playlist")
                    setMenu(undefined)
                  }}
                >
                  Add to playlist
                </Button>
              </div>
            )}
            <Button
              onClick={() => {
                openEdit(menu)
                setMenu(undefined)
              }}
            >
              <Pencil size={17} />
              Edit info &amp; cover
            </Button>
            {availability !== "stored" && availability !== "missing" && (
              <Button
                onClick={() => {
                  void aura.saveTrackOffline(menu)
                  setMenu(undefined)
                }}
              >
                <Download size={17} />
                Save for offline
              </Button>
            )}
            {availability === "stored" && canRemoveCopy && (
              <Button
                onClick={() => {
                  void aura.removeTrackOffline(menu)
                  setMenu(undefined)
                }}
              >
                <HardDrive size={17} />
                Remove offline copy
              </Button>
            )}
            <Button
              onClick={() => {
                onRelink(menu)
                setMenu(undefined)
              }}
            >
              <Link2 size={17} />
              Relink audio file
            </Button>
            <div className="info-line">
              <span>
                {menu.filename} · {(menu.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                {menu.plays} qualified plays
                {availability === "stored"
                  ? " · Stored offline"
                  : availability === "original"
                    ? " · Uses original file"
                    : availability === "permission-required"
                      ? " · File permission required"
                      : " · Audio missing"}
              </span>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                if (
                  window.confirm(
                    `Remove “${menu.title}” and its app-owned audio copy? It will be removed from playlists and queue. Your original file is untouched.`,
                  )
                ) {
                  void aura.deleteTrack(menu)
                  setMenu(undefined)
                }
              }}
            >
              <Trash2 size={17} />
              Remove from library
            </Button>
          </div>
        )}
      </Modal>
      <Modal
        open={!!editing}
        onClose={() => setEditing(undefined)}
        title="Edit track"
        description="Changes stay in your library. The audio file is untouched."
      >
        {editing && (
          <form
            className="edit-track"
            onSubmit={(e) => {
              e.preventDefault()
              void aura.updateTrack(editing, draft, art)
              setEditing(undefined)
            }}
          >
            <div className="edit-art">
              {artPreview ? (
                <div className="artwork">
                  <img src={artPreview} alt="New cover preview" />
                </div>
              ) : (
                <Artwork
                  id={art === null ? undefined : editing.id}
                  title={editing.title}
                />
              )}
              <div className="edit-art-actions">
                <label className="button secondary">
                  Choose image
                  <Field
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (!isSafeImage(f)) {
                        aura.notify(
                          "Cover must be a PNG, JPEG, WebP, GIF or AVIF image under 5 MB",
                        )
                        e.target.value = ""
                        return
                      }
                      setArt(f)
                      setArtPreview(URL.createObjectURL(f))
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setArt(null)
                    setArtPreview(undefined)
                  }}
                >
                  Remove cover
                </Button>
              </div>
            </div>
            <label>
              Title
              <Field
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                required
              />
            </label>
            <label>
              Artist
              <Field
                value={draft.artist}
                onChange={(e) => setDraft({ ...draft, artist: e.target.value })}
              />
            </label>
            <label>
              Album
              <Field
                value={draft.album}
                onChange={(e) => setDraft({ ...draft, album: e.target.value })}
              />
            </label>
            <label>
              Genres
              <Field
                value={draft.genres}
                placeholder="Ambient, jazz, electronic"
                onChange={(e) => setDraft({ ...draft, genres: e.target.value })}
              />
            </label>
            <label>
              Mood / activity tags
              <Field
                value={draft.moodTags}
                placeholder="Focus, late night, nostalgic"
                onChange={(e) =>
                  setDraft({ ...draft, moodTags: e.target.value })
                }
              />
            </label>
            <div className="form-row">
              <Button type="submit" variant="primary">
                Save
              </Button>
              <Button type="button" onClick={() => setEditing(undefined)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>
      {!tracks.length && (
        <div className="empty-small">
          <Heading>No tracks here yet</Heading>
          <p className="muted">Import some music or try a different search.</p>
        </div>
      )}
    </>
  )
}
