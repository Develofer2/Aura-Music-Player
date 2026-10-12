/** Playlist creation, editing and ordering. Copyright (c) 2026 Develofer2. MIT License. */
import { useState } from "react"
import {
  Plus,
  Play,
  Pencil,
  Copy,
  Trash2,
  ArrowLeft,
  ListMusic,
} from "lucide-react"
import { Artwork, Button, Field, Heading, Modal } from "../components/ui"
import { useAura } from "../state"
import type { Playlist, Track } from "../models"
import { player } from "../playback"
import TrackList from "../components/TrackList"
import { database, storageMessage } from "../storage"
export default function Playlists({
  id,
  navigate,
  onRelink,
}: {
  id?: string
  navigate: (page: string) => void
  onRelink: (track: Track) => void
}) {
  const aura = useAura(),
    selected = aura.playlists.find((p) => p.id === id)
  const [editor, setEditor] = useState(false),
    [editing, setEditing] = useState<Playlist>(),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [addTracks, setAddTracks] = useState(false),
    [query, setQuery] = useState("")
  function edit(list?: Playlist) {
    setEditing(list)
    setName(list?.name || "")
    setDescription(list?.description || "")
    setEditor(true)
  }
  async function save() {
    if (!name.trim()) return
    const list = editing
      ? { ...editing, name: name.trim(), description }
      : {
          id: crypto.randomUUID(),
          name: name.trim(),
          description,
          tracks: [],
          created: Date.now(),
        }
    await aura.playlist(list)
    setEditor(false)
    navigate(`playlist/${list.id}`)
  }
  async function cover(file?: File) {
    if (!file || !selected) return
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      aura.notify("Choose an image smaller than 5 MB.")
      return
    }
    try {
      const id = selected.coverId || `cover-${selected.id}`
      await (await database()).put("artwork", file, id)
      await aura.playlist({ ...selected, coverId: id })
    } catch (e) {
      aura.notify(storageMessage(e))
    }
  }
  return (
    <div className="page">
      {selected ? (
        <>
          <Button variant="ghost" onClick={() => navigate("playlists")}>
            <ArrowLeft size={17} />
            All playlists
          </Button>
          <div className="playlist-hero">
            <Artwork id={selected.coverId || selected.tracks[0]} />
            <div>
              <span className="eyebrow">MADE BY YOU</span>
              <Heading level={1}>{selected.name}</Heading>
              <p className="muted">
                {selected.description ||
                  "A soundtrack for your own kind of moment."}
              </p>
              <p className="muted">{selected.tracks.length} tracks</p>
              <div className="hero-actions">
                <Button
                  variant="primary"
                  disabled={!selected.tracks.length}
                  onClick={() => void player.start(selected.tracks)}
                >
                  <Play size={18} fill="currentColor" />
                  Play playlist
                </Button>
                <Button onClick={() => setAddTracks(true)}>
                  <Plus size={17} />
                  Add tracks
                </Button>
              </div>
            </div>
          </div>
          <div className="playlist-actions">
            <Button variant="ghost" onClick={() => edit(selected)}>
              <Pencil size={16} />
              Edit details
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                void aura.playlist({
                  ...selected,
                  id: crypto.randomUUID(),
                  name: `${selected.name} (Copy)`,
                  created: Date.now(),
                })
              }
            >
              <Copy size={16} />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (
                  confirm(
                    "Delete this playlist? Your audio tracks will stay in the library.",
                  )
                ) {
                  void aura.deletePlaylist(selected.id)
                  navigate("playlists")
                }
              }}
            >
              <Trash2 size={16} />
              Delete playlist
            </Button>
          </div>
          <label className="button secondary cover-picker">
            <Pencil size={16} />
            Choose a local cover
            <Field
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void cover(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </label>
          <TrackList
            tracks={selected.tracks
              .map((id) => aura.tracks.find((t) => t.id === id))
              .filter((t): t is Track => !!t)}
            onRelink={onRelink}
            playlist={selected}
          />
        </>
      ) : (
        <>
          <div className="section-heading page-intro">
            <div>
              <span className="eyebrow">SOUNDTRACKS FOR YOUR LIFE</span>
              <Heading level={1}>
                Made by you<span className="accent">.</span>
              </Heading>
              <p className="muted">
                For every mood, memory, and moment in between.
              </p>
            </div>
            <Button variant="primary" onClick={() => edit()}>
              <Plus size={18} />
              New playlist
            </Button>
          </div>
          {!aura.playlists.length ? (
            <div className="library-empty">
              <div className="dashed-icon">
                <ListMusic size={38} />
              </div>
              <Heading>A feeling, in track form.</Heading>
              <p className="muted">
                Late-night drives. Slow Sunday mornings.
                <br />
                What does your first playlist sound like?
              </p>
              <Button variant="primary" onClick={() => edit()}>
                <Plus size={17} />
                Create a playlist
              </Button>
            </div>
          ) : (
            <div className="playlist-grid">
              {aura.playlists.map((p) => (
                <Button
                  className="group-card"
                  variant="ghost"
                  key={p.id}
                  onClick={() => navigate(`playlist/${p.id}`)}
                >
                  <Artwork id={p.coverId || p.tracks[0]} />
                  <Heading level={3}>{p.name}</Heading>
                  <span className="muted">{p.tracks.length} tracks</span>
                </Button>
              ))}
            </div>
          )}
        </>
      )}
      <Modal
        open={editor}
        onClose={() => setEditor(false)}
        title={editing ? "Edit playlist" : "Start a new soundtrack"}
        description="Give your collection a little personality."
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <label>
            Name
            <Field
              autoFocus
              required
              maxLength={100}
              placeholder="e.g. After hours"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Description (optional)
            <Field
              maxLength={2000}
              placeholder="Set the scene..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <Button variant="primary" type="submit">
            Save playlist
          </Button>
        </form>
      </Modal>
      <Modal
        open={addTracks}
        onClose={() => setAddTracks(false)}
        title="Find the right tracks"
        description="Add from your saved library."
      >
        <Field
          aria-label="Search tracks to add"
          placeholder="Search tracks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="add-track-list">
          {aura.tracks
            .filter((t) =>
              `${t.title} ${t.artist}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((t) => (
              <div className="playlist-mini" key={t.id}>
                <Artwork id={t.id} />
                <span>
                  <strong>{t.title}</strong>
                  <small>{t.artist}</small>
                </span>
                <Button
                  onClick={() => {
                    if (selected)
                      void aura.playlist({
                        ...selected,
                        tracks: [...selected.tracks, t.id],
                      })
                    aura.notify(`Added “${t.title}”`)
                  }}
                >
                  <Plus size={16} />
                  Add
                </Button>
              </div>
            ))}
        </div>
        {!aura.tracks.length && (
          <p className="muted">Import music into your library first.</p>
        )}
      </Modal>
    </div>
  )
}
