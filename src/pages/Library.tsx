/** Library page: search, filter, sort and browse by track, album or artist. Copyright (c) 2026 Develofer2. MIT License. */
import { useMemo, useState } from "react"
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Play,
  Heart,
  ArrowLeft,
} from "lucide-react"
import {
  Artwork,
  Button,
  Field,
  Heading,
  IconButton,
  Select,
} from "../components/ui"
import TrackList from "../components/TrackList"
import { useAura } from "../state"
import { player } from "../playback"
import type { Track } from "../models"
export default function Library({
  onImport,
  onRelink,
  search,
  setSearch,
  navigate,
}: {
  onImport: () => void
  onRelink: (t: Track) => void
  search: string
  setSearch: (s: string) => void
  navigate: (page: string) => void
}) {
  const aura = useAura(),
    [tab, setTab] = useState("Songs"),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState(aura.prefs.librarySort || "added"),
    [grid, setGrid] = useState(aura.prefs.libraryView === "grid"),
    [group, setGroup] = useState<string>()
  const tracks = useMemo(() => {
    const found = aura.tracks.filter(
      (t) =>
        `${t.title} ${t.artist} ${t.album} ${t.filename}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (filter === "all" ||
          (filter === "favorites" && t.favorite) ||
          (filter === "unavailable" && t.missing) ||
          (filter === "recent" && Date.now() - t.added < 7 * 86400000)),
    )
    return found.sort((a, b) =>
      sort === "added"
        ? b.added - a.added
        : sort === "plays"
          ? b.plays - a.plays
          : sort === "duration"
            ? b.duration - a.duration
            : a[(sort as "title" | "artist" | "album")].localeCompare(
                b[(sort as "title" | "artist" | "album")],
              ),
    )
  }, [aura.tracks, search, filter, sort])
  const grouped = tab !== "Songs" && !group
  const groups = [
    ...new Set(tracks.map((t) => (tab === "Albums" ? t.album : t.artist))),
  ]
  const displayed = group
    ? tracks.filter((t) => (tab === "Albums" ? t.album : t.artist) === group)
    : tracks
  return (
    <div className="page">
      <div className="section-heading page-intro">
        <div>
          <span className="eyebrow">THE PERSONAL COLLECTION</span>
          <Heading level={1}>
            Your library<span className="accent">.</span>
          </Heading>
          <p className="muted">
            {aura.tracks.length} tracks. One place that’s entirely yours.
          </p>
        </div>
        <Button variant="primary" onClick={onImport}>
          <Plus size={18} />
          Import music
        </Button>
      </div>
      <div className="tabs">
        {["Songs", "Albums", "Artists"].map((t) => (
          <Button
            key={t}
            variant="ghost"
            className={tab === t ? "selected" : ""}
            onClick={() => {
              setTab(t)
              setGroup(undefined)
            }}
          >
            {t}
          </Button>
        ))}
      </div>
      <div className="library-toolbar">
        <div className="search-field">
          <Search size={17} />
          <Field
            aria-label="Search your library"
            placeholder="Search your library"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          aria-label="Filter tracks"
          value={filter}
          onValueChange={setFilter}
        >
          <option value="all">All tracks</option>
          <option value="favorites">Favorites</option>
          <option value="recent">Recently added</option>
          <option value="unavailable">Unavailable</option>
        </Select>
        <Select
          aria-label="Sort tracks"
          value={sort}
          onValueChange={(value) => {
            setSort(value)
            void aura.preferences({ librarySort: value })
          }}
        >
          <option value="added">Newest first</option>
          <option value="title">Title</option>
          <option value="artist">Artist</option>
          <option value="album">Album</option>
          <option value="duration">Duration</option>
          <option value="plays">Most played</option>
        </Select>
        <IconButton
          label={grid ? "List view" : "Grid view"}
          onClick={() => {
            setGrid(!grid)
            void aura.preferences({ libraryView: grid ? "list" : "grid" })
          }}
        >
          {grid ? <List size={19} /> : <LayoutGrid size={19} />}
        </IconButton>
      </div>
      {!!search &&
        aura.playlists.some((p) =>
          p.name.toLowerCase().includes(search.toLowerCase()),
        ) && (
          <section className="chart-card">
            <Heading level={3}>Matching playlists</Heading>
            <div className="hero-actions">
              {aura.playlists
                .filter((p) =>
                  p.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((p) => (
                  <Button
                    key={p.id}
                    onClick={() => navigate(`playlist/${p.id}`)}
                  >
                    {p.name}
                    <span className="muted">{p.tracks.length} tracks</span>
                  </Button>
                ))}
            </div>
          </section>
        )}
      {group && (
        <div className="section-heading">
          <Button onClick={() => setGroup(undefined)}>
            <ArrowLeft size={17} />
            Back to {tab.toLowerCase()}
          </Button>
          <Heading>{group}</Heading>
        </div>
      )}
      {!aura.tracks.length ? (
        <div className="library-empty">
          <div className="empty-art">
            <Artwork />
            <div className="empty-art-back">
              <Artwork />
            </div>
          </div>
          <Heading>Your collection starts here.</Heading>
          <p className="muted">
            The old favorites. The new discoveries. The track you can’t stop
            playing.
            <br />
            Bring them all. There’s room for every version of you.
          </p>
          <Button variant="primary" onClick={onImport}>
            <Plus size={17} />
            Import your first tracks
          </Button>
          <p className="small-label">SAVED IN THIS BROWSER · NEVER UPLOADED</p>
        </div>
      ) : grouped ? (
        <div className="track-grid">
          {groups.map((name) => {
            const list = tracks.filter(
              (t) => (tab === "Albums" ? t.album : t.artist) === name,
            )
            return (
              <Button
                variant="ghost"
                className="group-card"
                key={name}
                onClick={() => setGroup(name)}
              >
                <Artwork id={list[0]?.id} />
                <Heading level={3}>{name}</Heading>
                <span className="muted">{list.length} tracks</span>
              </Button>
            )
          })}
        </div>
      ) : (
        <>
          <div className="section-heading">
            <span className="muted">{displayed.length} tracks</span>
            <Button
              disabled={!displayed.length}
              onClick={() => void player.start(displayed.map((t) => t.id))}
            >
              <Play size={16} fill="currentColor" />
              Play all
            </Button>
          </div>
          <TrackList tracks={displayed} onRelink={onRelink} grid={grid} />
        </>
      )}
      {!!aura.tracks.length && !tracks.length && (
        <Button
          onClick={() => {
            setSearch("")
            setFilter("all")
          }}
        >
          Clear search & filters
        </Button>
      )}
    </div>
  )
}
