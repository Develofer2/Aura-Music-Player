/** Explainable on-device smart playlist builder. */
import { useMemo, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Compass,
  ListPlus,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react"
import {
  Button,
  Field,
  Heading,
  IconButton,
  Modal,
  Select,
  Slider,
} from "../components/ui"
import { useAura } from "../state"
import { player } from "../playback"
import type {
  RecommendationProfile,
  RecommendationPurpose,
  RecommendationWeights,
  Track,
} from "../models"
import {
  defaultRecommendationProfiles,
  defaultRecommendationWeights,
  generateSmartPlaylist,
  recommendationPurposes,
} from "../recommendations"
import { normalizeMetadataList } from "../metadata"

type WeightKey = keyof RecommendationWeights
const weightKeys: WeightKey[] = Object.keys(
  defaultRecommendationWeights,
) as WeightKey[]
const weightNames: Record<keyof RecommendationWeights, string> = {
  moodTag: "Mood and activity tags",
  genre: "Genres",
  profile: "Your preferred tags and genres",
  directFeedback: "Direct feedback",
  feedbackSimilarity: "Similar metadata",
  favorite: "Favorites",
  playCount: "Play count",
  recency: "Rediscovery",
  timeOfDay: "Time-of-day history",
}

export default function Discover({
  onImport,
  onRelink: _onRelink,
  navigate,
}: {
  onImport: () => void
  onRelink: (track: Track) => void
  navigate: (id: string) => void
}) {
  const aura = useAura()
  const [purpose, setPurpose] = useState<RecommendationPurpose>("happy")
  const stored =
    aura.recommendationProfiles[purpose] ||
    defaultRecommendationProfiles[purpose]
  const [preferredGenres, setPreferredGenres] = useState("")
  const [preferredTags, setPreferredTags] = useState("")
  const [drafts, setDrafts] =
    useState<Partial<Record<RecommendationPurpose, string[]>>>({})
  const [rulesOpen, setRulesOpen] = useState(false)
  const [excludedOpen, setExcludedOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addSearch, setAddSearch] = useState("")
  const [saveOpen, setSaveOpen] = useState(false)
  const [playlistName, setPlaylistName] = useState("")
  const [weights, setWeights] = useState<Partial<RecommendationWeights>>({})
  const profile: RecommendationProfile = {
    ...stored,
    weights: stored.weights || {},
  }
  const result = useMemo(
    () =>
      generateSmartPlaylist({
        tracks: aura.tracks,
        events: aura.events,
        purpose,
        profile,
        feedback: aura.recommendationFeedback,
        settings: aura.recommendationSettings,
        personalized: aura.prefs.personalizedRecommendations,
        now: Date.now(),
        seed: aura.recommendationSettings.refreshSeeds[purpose] || 0,
      }),
    [
      aura.events,
      aura.prefs.personalizedRecommendations,
      aura.recommendationFeedback,
      aura.recommendationSettings,
      aura.tracks,
      profile,
      purpose,
    ],
  )
  const generatedIds = result.entries.map((entry) => entry.trackId)
  const draftIds = drafts[purpose] || generatedIds
  const draftTracks = draftIds
    .map((id) => aura.tracks.find((track) => track.id === id))
    .filter((track): track is Track => !!track)
  const selected = recommendationPurposes.find((item) => item.id === purpose)!
  const excluded = aura.tracks.filter((track) =>
    aura.recommendationSettings.excludedTrackIds.includes(track.id),
  )
  const updateDraft = (ids: string[]) =>
    setDrafts((current) => ({ ...current, [purpose]: ids }))
  const saveProfile = (patch: Partial<RecommendationProfile>) =>
    aura.saveRecommendationProfile({
      ...profile,
      ...patch,
      purpose,
    })
  const move = (index: number, delta: number) => {
    const next = [...draftIds]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    updateDraft(next)
  }
  return (
    <div className="page discovery-page">
      <div className="section-heading page-intro">
        <div>
          <span className="eyebrow">BUILT HERE, FROM YOUR MUSIC</span>
          <Heading level={1}>
            Smart playlists<span className="accent">.</span>
          </Heading>
          <p className="muted">
            Transparent local rules. No uploads, account, API key, or network.
          </p>
        </div>
        <span className="local-recommendation">
          <ShieldCheck size={16} />
          On-device only
        </span>
      </div>

      <section>
        <div className="section-heading">
          <div>
            <Heading>Choose a purpose</Heading>
            <p className="muted">AURA only uses metadata you actually saved.</p>
          </div>
        </div>
        <div className="purpose-grid" aria-label="Choose a playlist purpose">
          {recommendationPurposes.map((item) => (
            <Button
              key={item.id}
              variant={purpose === item.id ? "primary" : "secondary"}
              aria-pressed={purpose === item.id}
              onClick={() => {
                setPurpose(item.id)
                setPreferredGenres("")
                setPreferredTags("")
              }}
            >
              <span>
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </span>
            </Button>
          ))}
        </div>
      </section>

      <section className="discovery-hero smart-builder-controls">
        <div>
          <span className="eyebrow">CURRENT PURPOSE</span>
          <Heading>{selected.name}</Heading>
          <p className="muted">{selected.detail}</p>
          <p className="discovery-explainer">
            {aura.prefs.personalizedRecommendations
              ? "Favorites, plays, recency, and relevant listening times may act as small tie-breakers after a real metadata match."
              : "Listening behavior is off. Tags, genres, preferences, and direct feedback still apply."}
          </p>
        </div>
        <div className="builder-actions">
          <label>
            Target size
            <Select
              aria-label="Target playlist size"
              value={profile.targetSize}
              onValueChange={(value) =>
                void saveProfile({
                  targetSize: Number(value) as 10 | 20 | 30 | 50,
                })
              }
            >
              {[10, 20, 30, 50].map((size) => (
                <option value={size} key={size}>
                  {size} tracks
                </option>
              ))}
            </Select>
          </label>
          <Button
            onClick={() => {
              setWeights(profile.weights || {})
              setRulesOpen(true)
            }}
          >
            <SlidersHorizontal size={17} />
            Adjust rules
          </Button>
          <Button
            onClick={() => {
              void aura.refreshRecommendations(purpose)
              setDrafts((current) => ({ ...current, [purpose]: undefined }))
            }}
          >
            <RefreshCw size={17} />
            Refresh suggestions
          </Button>
        </div>
      </section>

      <section className="chart-card builder-preferences">
        <div className="section-heading">
          <div>
            <Heading>Optional preferences</Heading>
            <p className="muted">
              Exact comma-separated matches only. AURA does not infer missing
              metadata.
            </p>
          </div>
        </div>
        <div className="form-row">
          <label>
            Preferred genres
            <Field
              value={preferredGenres}
              placeholder={
                (profile.preferredGenres || []).join(", ") || "Ambient, jazz"
              }
              onChange={(event) => setPreferredGenres(event.target.value)}
            />
          </label>
          <label>
            Preferred tags
            <Field
              value={preferredTags}
              placeholder={
                (profile.preferredTags || []).join(", ") || "Focus, calm"
              }
              onChange={(event) => setPreferredTags(event.target.value)}
            />
          </label>
          <Button
            onClick={() =>
              void saveProfile({
                preferredGenres: normalizeMetadataList(preferredGenres),
                preferredTags: normalizeMetadataList(preferredTags),
              })
            }
          >
            Apply preferences
          </Button>
        </div>
      </section>

      <section className="discovery-list">
        <div className="section-heading">
          <div>
            <Heading>Draft playlist</Heading>
            <p className="muted" role="status" aria-live="polite">
              {draftTracks.length} in draft · {result.eligibleCount} matching
            </p>
          </div>
          <div className="builder-actions">
            <Button
              disabled={!draftTracks.length}
              onClick={() =>
                void player.start(draftTracks.map((track) => track.id))
              }
            >
              <Play size={17} fill="currentColor" />
              Play preview
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <ListPlus size={17} />
              Add track
            </Button>
            <Button
              variant="primary"
              disabled={!draftTracks.length}
              onClick={() => {
                setPlaylistName(selected.name)
                setSaveOpen(true)
              }}
            >
              <Save size={17} />
              Save playlist
            </Button>
          </div>
        </div>
        {result.limitation && result.limitation !== "empty-library" && (
          <div className="info-line">
            <Compass size={18} />
            <span>
              {result.limitation === "no-match"
                ? "No matching metadata was found. Add genres or mood/activity tags to tracks, or relax your preferred filters."
                : `Only ${result.eligibleCount} tracks have real matching evidence, so AURA did not pad this mix with unrelated music.`}
            </span>
          </div>
        )}
        {!aura.tracks.length ? (
          <div className="library-empty">
            <Compass size={44} />
            <Heading>Smart playlists start with your music.</Heading>
            <p className="muted">
              Import tracks, then add real genres or mood/activity tags.
            </p>
            <Button variant="primary" onClick={onImport}>
              Import music
            </Button>
          </div>
        ) : draftTracks.length ? (
          <div className="recommendation-list">
            {draftTracks.map((track, index) => {
              const scored = result.entries.find(
                (entry) => entry.trackId === track.id,
              )
              const feedback = aura.recommendationFeedback.find(
                (item) => item.purpose === purpose && item.trackId === track.id,
              )
              return (
                <div
                  className="recommendation-row"
                  key={`${track.id}-${index}`}
                >
                  <div>
                    <strong>{track.title}</strong>
                    <span className="muted">{track.artist}</span>
                    <small>
                      {scored
                        ? scored.reasons
                            .sort(
                              (a, b) => Math.abs(b.value) - Math.abs(a.value),
                            )
                            .slice(0, 3)
                            .map((reason) => reason.label)
                            .join(" · ")
                        : "Added manually"}
                    </small>
                  </div>
                  <div className="row-actions">
                    <IconButton
                      label={`More like ${track.title}`}
                      aria-pressed={feedback?.affinity === 1}
                      className={feedback?.affinity === 1 ? "active" : ""}
                      onClick={() =>
                        void aura.setRecommendationFeedback(
                          purpose,
                          track.id,
                          feedback?.affinity === 1 ? undefined : 1,
                        )
                      }
                    >
                      <ThumbsUp size={16} />
                    </IconButton>
                    <IconButton
                      label={`Less like ${track.title}`}
                      aria-pressed={feedback?.affinity === -1}
                      className={feedback?.affinity === -1 ? "active" : ""}
                      onClick={() =>
                        void aura.setRecommendationFeedback(
                          purpose,
                          track.id,
                          feedback?.affinity === -1 ? undefined : -1,
                        )
                      }
                    >
                      <ThumbsDown size={16} />
                    </IconButton>
                    <IconButton
                      label={`Exclude ${track.title}`}
                      onClick={() => {
                        void aura.setTrackExcluded(track.id, true)
                        updateDraft(draftIds.filter((id) => id !== track.id))
                      }}
                    >
                      <X size={16} />
                    </IconButton>
                    <IconButton
                      label="Move track up"
                      disabled={!index}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={16} />
                    </IconButton>
                    <IconButton
                      label="Move track down"
                      disabled={index === draftTracks.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={16} />
                    </IconButton>
                    <IconButton
                      label={`Remove ${track.title} from draft`}
                      onClick={() =>
                        updateDraft(
                          draftIds.filter((_, item) => item !== index),
                        )
                      }
                    >
                      <X size={16} />
                    </IconButton>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="library-empty">
            <Sparkles size={42} />
            <Heading>AURA won’t guess.</Heading>
            <p className="muted">
              Edit your tracks to add genres and mood/activity tags, then
              refresh.
            </p>
          </div>
        )}
        {!!excluded.length && (
          <Button variant="ghost" onClick={() => setExcludedOpen(true)}>
            Manage {excluded.length} excluded track
            {excluded.length === 1 ? "" : "s"}
          </Button>
        )}
      </section>

      <Modal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        title="Adjust recommendation rules"
        description="Zero disables a signal. Listening-derived signals are unavailable while personalization is off."
      >
        <div className="form-stack">
          {weightKeys.map((key) => {
            const behavioral = [
              "favorite",
              "playCount",
              "recency",
              "timeOfDay",
            ].includes(key)
            const value = weights[key] ?? defaultRecommendationWeights[key]
            return (
              <label key={key}>
                <span>
                  {weightNames[key]} · {value}
                </span>
                <Slider
                  label={weightNames[key]}
                  min={0}
                  max={20}
                  step={0.5}
                  value={value}
                  disabled={
                    behavioral && !aura.prefs.personalizedRecommendations
                  }
                  onChange={(event) =>
                    setWeights({
                      ...weights,
                      [key]: Number(event.target.value),
                    })
                  }
                />
              </label>
            )
          })}
          <div className="form-row">
            <Button
              variant="primary"
              onClick={() => {
                void saveProfile({ weights })
                setRulesOpen(false)
              }}
            >
              Save rules
            </Button>
            <Button
              onClick={() => {
                setWeights({})
                void saveProfile({ weights: {} })
                setRulesOpen(false)
              }}
            >
              Reset defaults
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={excludedOpen}
        onClose={() => setExcludedOpen(false)}
        title="Excluded tracks"
        description="Excluded tracks stay out of every generated mix until restored."
      >
        <div className="form-stack">
          {excluded.map((track) => (
            <div className="settings-row" key={track.id}>
              <span>
                <strong>{track.title}</strong>
                <small className="muted">{track.artist}</small>
              </span>
              <Button
                onClick={() => void aura.setTrackExcluded(track.id, false)}
              >
                Restore
              </Button>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a library track"
        description="Manual additions are kept in the draft but are not presented as rule matches."
      >
        <div className="form-stack">
          <Field
            aria-label="Search tracks to add"
            placeholder="Search title, artist, or album"
            value={addSearch}
            onChange={(event) => setAddSearch(event.target.value)}
          />
          {aura.tracks
            .filter(
              (track) =>
                !draftIds.includes(track.id) &&
                `${track.title} ${track.artist} ${track.album}`
                  .toLocaleLowerCase()
                  .includes(addSearch.toLocaleLowerCase()),
            )
            .slice(0, 30)
            .map((track) => (
              <Button
                key={track.id}
                onClick={() => {
                  updateDraft([...draftIds, track.id])
                  setAddOpen(false)
                }}
              >
                <span>
                  <strong>{track.title}</strong>
                  <small>{track.artist}</small>
                </span>
              </Button>
            ))}
        </div>
      </Modal>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save smart playlist"
        description="This creates a normal editable playlist in the current draft order."
      >
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault()
            const id = crypto.randomUUID()
            void aura
              .playlist({
                id,
                name: playlistName.trim().slice(0, 100),
                description: `Generated locally for ${selected.name}. Saved as a fixed, editable playlist.`,
                tracks: draftTracks.map((track) => track.id),
                created: Date.now(),
              })
              .then(() => {
                setSaveOpen(false)
                aura.notify("Smart playlist saved.")
                navigate(`playlist/${id}`)
              })
          }}
        >
          <label>
            Playlist name
            <Field
              autoFocus
              required
              maxLength={100}
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            disabled={!playlistName.trim() || !draftTracks.length}
          >
            Save playlist
          </Button>
        </form>
      </Modal>
    </div>
  )
}
