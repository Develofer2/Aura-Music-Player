# AURA Smart Playlist Engine — Implementation Plan

## Goal

Replace the current six-mode sorting helper with a real, deterministic recommendation service and a transparent playlist-builder experience for these eight purposes:

1. Happy & Energized
2. Sad & Reflective
3. Study & Deep Focus
4. Sleep & Unwind
5. Chill & Relaxed
6. Workout & Motivation
7. Nostalgic
8. Late-Night Listening

All recommendation work remains local, requires no network/API/authentication/backend, never analyzes or uploads audio, and uses only metadata and user data that actually exist in AURA.

## Product decisions locked for implementation

- Keep the existing `#discover` route and rename/rework its content rather than adding a parallel recommendations screen.
- Keep generated mixes as drafts until the user explicitly saves one into the existing `playlists` store. Saved smart playlists become ordinary editable playlists; they do not silently mutate later.
- Default requested size is 20 tracks. The builder exposes 10, 20, 30, and 50 track targets. If fewer eligible tracks exist, return all eligible tracks and show a specific limitation message rather than padding with weak or unrelated choices.
- “More like this” and “Less like this” are per-track, per-purpose feedback actions. They affect tracks sharing real artist, genre, or user-tag metadata; they do not fabricate similarity. “Exclude” is global and removes a track from all generated mixes until restored.
- Listening behavior means favorites, play counts, recency, and time-of-day listening events. It is included only when `personalizedRecommendations` is enabled. Explicit profile preferences, manually assigned tags, and recommendation feedback continue to apply because they are direct user instructions rather than inferred behavior.
- Favorites and play counts are small, gated tie-breakers: they can strengthen a track that already has purpose-specific evidence, but cannot make an otherwise unrelated favorite fit every purpose.
- Refresh changes a local deterministic seed so close-scoring tracks can rotate. The same inputs plus the same seed, clock, and weights always produce the same result, making the service testable.
- Use exact, normalized, case-insensitive matching against stored genres and tags. Purpose profiles define disclosed genre/tag associations; AURA will not infer unrecorded genres, moods, BPM, energy, or artist attributes.
- Missing metadata is handled conservatively. Untagged tracks receive no mood/genre match score and are omitted unless an explicit profile preference or valid purpose-specific behavior signal makes them eligible. The UI points users to track editing to add tags.
- Duplicate prevention uses both track ID and fingerprint. Missing/unavailable and globally excluded tracks are hard-filtered before scoring.
- Variety is applied after ranking: avoid adjacent tracks by the same artist and cap an artist at the greater of two tracks or 20% of the requested size when enough alternatives exist. Relax only the artist cap—not exclusions or eligibility—when needed to fill from a genuinely small matching pool.
- Keep the project’s existing AURA kit primitives (`Button`, `IconButton`, `Field`, `Select`, `Slider`, `Modal`, `Heading`, `Artwork`), Lucide icons, semantic tokens, theme system, and responsive shell. Do not introduce another component library or modify the kit module.

## Data model and persistence

### Track metadata

Extend `Track` in `src/models.ts` with optional, backward-compatible fields:

- `genres?: string[]` — embedded genres when available, then user-editable.
- `moodTags?: string[]` — user-assigned free-form mood/activity tags.

Normalize both fields at write boundaries: trim, collapse whitespace, remove empties, compare case-insensitively, deduplicate while preserving the first display spelling, cap each item and list length, and sanitize through existing text utilities. Existing tracks require no destructive rewrite; absent arrays mean unknown metadata.

Update `src/importer.ts` to read `music-metadata`’s `common.genre` values when present. Do not infer a genre from filenames, artists, albums, or folders. Extend the existing Edit Track modal and `updateTrack` state method to edit genres and mood/activity tags as comma-separated values with examples tied to the eight purposes.

### Recommendation records

Add typed models:

- `RecommendationPurpose` — the eight stable IDs.
- `RecommendationWeights` — numeric weights for mood-tag match, genre match, explicit profile match, direct feedback, feedback similarity, favorite, play count, recency/rediscovery, and time-of-day history.
- `RecommendationProfile` — purpose ID, target size, preferred genres, preferred tags, and partial weight overrides.
- `RecommendationFeedback` — stable ID, purpose ID, track ID, affinity (`1` for more, `-1` for less), and `updatedAt`.
- `RecommendationSettings` — global excluded track IDs and a refresh seed per purpose.

Clamp persisted weight overrides to documented finite ranges before scoring so malformed or extreme values cannot destabilize ranking.

### IndexedDB v3

Upgrade `src/storage.ts` from database version 2 to 3 and create:

- `recommendationProfiles`, keyed by purpose ID.
- `recommendationFeedback`, keyed by feedback ID.

Store the singleton global recommendation settings under the existing `settings` store key `recommendations` so exclusions and refresh seeds are transactional with other settings. Extend `AuraDB`’s settings union accordingly.

Add focused storage functions to load/save a profile, upsert/remove feedback, update exclusions/seeds, and load the complete recommendation state. Include this state in `loadLibrary()` and the React provider. Deleting a track must also remove its recommendation feedback and exclusion reference in the same mutation flow. `clearDatabase()` must clear both new stores.

### Backup v2 with v1 compatibility

Evolve `src/backup.ts` to export backup version 2 containing recommendation profiles, feedback, settings, and the new optional track metadata. Validation must enforce known purpose IDs, bounded arrays/text, valid referenced IDs, finite/clamped weights, valid affinities, unique record identifiers, and existing collection-size limits.

Continue accepting version 1 backups. Treat their missing genres/tags/recommendation data as empty. During restore:

- sanitize genres and mood tags;
- remap feedback and exclusions through the existing old-track-ID to restored-track-ID map;
- ignore records whose tracks do not restore;
- merge profiles by purpose with imported explicit values winning for that purpose;
- merge feedback by purpose/track with the newest `updatedAt` winning;
- union valid exclusions;
- preserve existing local audio and the current merge/deduplication behavior.

## Recommendation service

Replace `src/recommendations.ts` with a UI-independent, pure service. No React, IndexedDB, player, or browser-global reads inside the scoring/generation functions. Inject `now`, refresh seed, settings, profile, events, and personalization flag through a request object.

### Public contract

Expose functions/types equivalent to:

- `scoreTrack(track, context) -> ScoredRecommendation | null`
- `generateSmartPlaylist(request) -> RecommendationResult`
- `defaultRecommendationProfiles` and purpose display metadata

`ScoredRecommendation` includes the track ID, total score, and a structured list of contributing reasons with labels and signed values. `RecommendationResult` includes ranked selected entries, eligible count, requested count, and an optional limitation code/message. The UI consumes these explanations; it does not reproduce scoring logic.

### Profile evidence

Define explicit, visible mappings for each purpose using only normalized stored values. Examples include user tags such as `happy`, `energized`, `reflective`, `focus`, `sleep`, `relaxed`, `workout`, `nostalgic`, and `late night`, plus conservative genre associations such as ambient/classical for sleep or focus and dance/electronic for energy/workout. Keep mappings in one exported configuration so they can be shown in the builder and unit-tested.

A track is eligible only when it has positive purpose evidence after penalties, or direct positive user feedback for that purpose. Generic popularity alone is not eligibility.

### Scoring pipeline

For each available, non-excluded, unique track:

1. Normalize real track genres and mood tags.
2. Calculate exact profile mood-tag and genre overlaps.
3. Apply the selected profile’s preferred genre/tag matches.
4. Apply direct per-purpose feedback.
5. Apply similarity feedback only for shared real metadata:
   - strongest for shared user mood tags;
   - then shared genres;
   - small artist match;
   - no similarity contribution if there is no shared metadata.
6. If behavior personalization is enabled and the track already has purpose evidence, apply bounded/log-normalized favorite, play-count, recency/rediscovery, and relevant time-window contributions.
7. For Late-Night Listening only, use actual local listening event start hours in the disclosed late-night window (22:00–04:59). For Nostalgic, use user tags/preferences first and a small rediscovery signal for previously played tracks not heard recently; never equate “old file” with nostalgia.
8. Add a tiny seeded tie-break value that cannot overpower a meaningful score difference.
9. Return the total and only nonzero explanation factors.

Sort by score descending with stable title/ID fallbacks, then run the variety selector. Never mutate input arrays.

### Configurable weights

Provide conservative defaults per purpose and an “Adjust rules” modal in the builder using labeled kit `Slider` controls. Users can reset a purpose to defaults. Persist only overrides, not duplicated defaults, so future safe default tuning remains possible. Explain that zero disables a signal. Listening-derived controls are visibly disabled when behavior personalization is off; tag, genre, preference, and feedback weights remain available.

## React state and actions

Extend `src/state.tsx` with loaded recommendation profiles, feedback, and settings plus narrow async actions:

- save/reset a purpose profile;
- set or clear more/less feedback;
- globally exclude/restore a track;
- increment a purpose refresh seed;
- update genres/mood tags through the existing track-edit action.

Use the provider’s existing mutation/error/toast/BroadcastChannel behavior so recommendation changes synchronize between tabs and surface storage failures consistently. Do not place draft playlist UI state in IndexedDB; only persisted preferences/feedback and explicitly saved playlists belong there.

## Smart playlist builder UI

Rework `src/pages/Discover.tsx` into a responsive builder while preserving the current page’s local-only messaging and visual language.

### Builder flow

1. **Choose a purpose:** eight accessible selected-state buttons/cards using the exact requested names and concise descriptions.
2. **Tune the request:** target-size `Select`, optional preferred genre and free-form tag fields, “Adjust rules,” and a clear indicator of whether listening behavior is contributing. Saving these controls updates the selected purpose profile.
3. **Generate/refresh:** call the pure service from memoized local data. “Refresh suggestions” increments the local seed; it never calls a network service.
4. **Preview and understand:** show the draft count, a limitation notice when applicable, “Play preview,” and rows/cards with the top reasons from the service. Empty-library and no-match states differ: empty library offers Import Music; no-match explains that AURA will not guess and offers guidance to add genres/tags or relax explicit filters.
5. **Give feedback:** each result supports More like this, Less like this, and Exclude. The active feedback state is visible and reversible. Add an “Excluded tracks” management modal so global exclusions can be restored.
6. **Edit the draft:** remove tracks, move tracks up/down, and add any real library track through a searchable modal. Manual additions are clearly marked and are not presented as rule matches. Draft ordering is preserved.
7. **Save:** open a save modal prefilled with the purpose name and a transparent generated description; validate with existing playlist limits, save through `aura.playlist`, notify success, and navigate to the normal playlist detail page. Saving an empty draft is disabled.

Keep edits made to a draft when profile controls or feedback change by tracking manual removals/additions separately; “Regenerate” explicitly replaces the generated portion while retaining manual additions only after user confirmation. A purpose switch starts that purpose’s own draft and profile state.

### Track metadata editing

Extend the existing Track List edit modal rather than introducing a second metadata editor. Add visible Genre and Mood/activity tags fields. After saving tags, recommendation results recompute from actual persisted metadata. Preserve current title/artist/album/artwork behavior.

### Accessibility and responsive behavior

- Use semantic heading order, visible field labels, `aria-pressed` for purpose and feedback toggles, and required labels for icon-only actions.
- Preserve keyboard operation and focus restoration through kit controls/Radix modals.
- Announce refreshed result counts and limitation changes with a polite status region.
- On narrow screens, stack the purpose selector, controls, explanations, and row actions without horizontal scrolling; retain at least the kit’s control target size.
- Use semantic AURA tokens and existing material/theme selectors only; no hardcoded screen colors.

## Files expected to change

- `src/models.ts` — optional track metadata and recommendation types/defaults.
- `src/importer.ts` — extract real embedded genres.
- `src/storage.ts` — IndexedDB v3 migration, stores, CRUD/load/delete/clear behavior.
- `src/backup.ts` — backup v2 export/validation/restore and v1 compatibility.
- `src/recommendations.ts` — pure scoring, explanation, generation, deduplication, and variety service.
- `src/state.tsx` — recommendation state/actions and expanded track metadata update.
- `src/components/TrackList.tsx` — genre/tag editing fields.
- `src/pages/Discover.tsx` — full smart playlist builder.
- `src/index.css` — builder layout/states using existing tokens and responsive conventions.
- `tests/recommendations.test.ts` — focused service unit tests.
- `tests/storage.test.ts` — v3 persistence, deletion cleanup, and backup compatibility tests.
- `tests/browser/aura.spec.ts` or a focused new browser spec — critical builder/save/feedback/tagging flow.

Do not alter generated dependencies, add remote SDKs, or add a backend.

## Test plan

### Unit: recommendation service

Use fixed timestamps and seeds. Cover at minimum:

- each of the eight purposes recognizes only matching stored tags/genres;
- weight overrides change ranking and zero disables that signal;
- favorites/play counts cannot make an unrelated track eligible;
- personalization off removes favorites, history, recency, and time-of-day contributions but retains explicit tags/preferences/feedback;
- direct more/less feedback changes rank for only the selected purpose;
- similar feedback propagates only through real shared artist/genre/tag metadata;
- global exclusions are never returned;
- missing tracks are never returned;
- duplicate IDs and fingerprints produce one result;
- deterministic seed behavior and refresh rotation among close scores;
- artist cap/adjacency variety with graceful relaxation for small libraries;
- empty library returns an empty, typed limitation result;
- insufficient matching tracks return a smaller list and limitation;
- missing metadata is handled conservatively;
- no input array/object is mutated;
- generated results contain only IDs from the supplied library.

### Unit: storage and backup

Cover:

- IndexedDB v3 stores/load round-trip for profiles, feedback, exclusions, and seeds;
- track deletion cleans feedback and exclusions;
- clearing the database clears recommendation records;
- genre/tag normalization and persistence;
- backup v2 round-trip;
- valid backup v1 import with empty recommendation defaults;
- malformed purpose IDs, affinities, weights, tags, and dangling references are rejected or dropped according to the validation/restore boundary;
- restored recommendation track IDs are remapped correctly after fingerprint merging.

### Browser

Seed tracks with known metadata and verify:

- purpose selection displays matching real tracks and transparent reasons;
- no-match messaging explains the smaller/empty result instead of inventing tracks;
- editing tags makes a track eligible after save;
- More/Less feedback and Exclude persist across reload, and exclusions can be restored;
- refresh stays local and changes eligible ordering without introducing other tracks;
- draft remove/reorder/manual-add behavior works;
- preview starts only the visible draft IDs;
- saving creates an ordinary playlist with exact draft order and navigates to its detail page;
- core flow remains keyboard-operable and works at the project’s existing mobile viewport coverage.

## Verification sequence

1. Format only changed files through the repository script: `pnpm format -- <changed files>`.
2. Run focused unit tests while iterating: `pnpm test -- tests/recommendations.test.ts tests/storage.test.ts`.
3. Run the full unit suite: `pnpm test`.
4. Run the production build: `pnpm build`.
5. Run the relevant browser spec first, then the full browser suite because this changes persistence, track editing, discovery, and playlist creation: `pnpm test:browser -- <spec>` followed by `pnpm test:browser`.
6. Do not start another development server; use the already-running Figma Make Vite server and hot reload. Inspect `figma logs` only if a concrete runtime failure appears.

## Acceptance criteria

- The exact eight requested purpose mixes are available and generated solely from the local library.
- Scoring is configurable, deterministic, explainable, and implemented in a service independent of React/UI and persistence.
- No generated result references a nonexistent, missing, duplicate, or excluded track.
- Listening behavior is optional and never acts as universal mood evidence.
- Users can edit tags, provide reversible feedback, exclude/restore tracks, refresh, preview, edit, and save a generated playlist.
- Small or poorly tagged libraries produce honest smaller/empty results with actionable explanations.
- Preferences, feedback, exclusions, and profile settings survive reload through IndexedDB and are represented in validated backups.
- The feature works with networking unavailable and introduces no API key, remote request, authentication, paid service, fake chat, or AI labeling.
- Unit tests explicitly cover scoring, exclusions, duplicate prevention, empty libraries, and playlist generation, with storage/backup and critical browser flows also verified.
