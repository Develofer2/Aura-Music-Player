# AURA Smart Playlists + Offline-First PWA — Implementation Plan

## Goal

Extend the existing AURA React/Vite app without rebuilding it so that:

1. The current simple six-mode discovery sorter becomes an eight-purpose, deterministic, explainable smart-playlist engine that runs entirely from local data.
2. AURA becomes an installable PWA whose production application shell, local library, saved playlists, themes, listening history/statistics, queue, sleep timer, and locally available audio continue to work offline after the first successful online load.
3. Existing IndexedDB data, audio blobs, file handles, themes, playback behavior, navigation, design tokens, and tests remain intact through upgrades.

The work is staged so the IndexedDB v3 schema and recommendation domain land first, then the UI, then the PWA/offline shell and operational validation.

## Repository facts that govern the implementation

- React 19, TypeScript, Vite 8, Tailwind v4; the Vite development server is already managed by Figma Make and must not be started manually.
- IndexedDB currently uses `idb`, database name `aura`, schema version 2, with `tracks`, `sources`, `playlists`, `events`, `settings`, and `artwork` stores.
- Audio already uses a hybrid model: copied audio is a Blob in `sources`; referenced audio uses `FileSystemFileHandle`; `Track.access` is `copy | reference`; unavailable references use `missing`.
- Imported files already receive storage estimates, quota warnings, persistent-storage requests, duplicate review, folder scanning, and copy/reference selection.
- The current app has no service worker or manifest and loads Manrope/Space Grotesk from Google Fonts, so the production UI is not currently self-contained offline.
- The deployment base is dynamic through `FIGMA_PUBLIC_URL`; all PWA URLs and service-worker scope must honor Vite’s resolved base path.
- AURA has its own kit primitives and semantic theme tokens. New UI must reuse `Button`, `IconButton`, `Field`, `Select`, `Slider`, `Modal`, `Heading`, `Artwork`, Lucide icons, and existing layout/token conventions.
- The production build injects a CSP. After self-hosting fonts, production CSP should no longer need Google Fonts origins.

## Locked product and technical decisions

### Smart playlists

- Keep and rework the existing `#discover` route rather than adding a parallel page.
- Support exactly eight purposes: Happy & Energized, Sad & Reflective, Study & Deep Focus, Sleep & Unwind, Chill & Relaxed, Workout & Motivation, Nostalgic, and Late-Night Listening.
- Recommendations are local-only and never inspect/upload audio, call a network, require an account, or claim to be remote AI.
- Generated mixes are drafts until explicitly saved. Saved results become ordinary editable playlists and do not silently mutate.
- Default target is 20 tracks; selectable targets are 10, 20, 30, and 50. Smaller eligible pools return honest partial results.
- Direct feedback is per track/per purpose. Exclusion is global until restored.
- Behavior-derived signals are gated by `personalizedRecommendations`; explicit tags, profile preferences, and direct feedback remain active because they are user instructions.
- Missing/unavailable tracks and duplicate IDs/fingerprints are hard-filtered.
- The same inputs, clock, purpose, weights, and refresh seed produce the same result.

### Offline/PWA

- Add one service worker through `vite-plugin-pwa`; do not introduce competing custom registration.
- Use generated service-worker precaching for hashed production shell assets and a navigation fallback to the built `index.html` within the deployment base.
- Cache only application assets. Never put personal audio, IndexedDB records, private/API responses, or arbitrary cross-origin responses in Cache Storage.
- Keep user data in IndexedDB. Service-worker activation may remove obsolete Workbox/application caches but must never delete IndexedDB.
- Self-host Manrope and Space Grotesk with local font packages/assets included in the Vite build; remove the Google Fonts CSS import and remote font CSP allowances.
- Use `registerType: "prompt"` rather than auto-reloading an actively playing app. Show an unobtrusive “Update ready” action; apply it only after user confirmation, warning if playback is active.
- Use a shared connectivity hook/service with `online`, `offline`, and short-lived `reconnecting` states. `navigator.onLine` and browser events are hints only; optional remote providers must still handle request failures independently.
- No remote AI provider or streaming service is added in this release. The service interface may distinguish local from future remote providers, but the visible product must state that recommendations are on-device.
- Installation UI is capability-based: capture `beforeinstallprompt` where supported; otherwise show concise browser-specific guidance only when useful. Never claim universal install support.
- The first-use notice explains that AURA must first load successfully online and that music must be copied or remain permission-accessible for offline playback. Store dismissal as a small local preference.
- Track availability is represented honestly from source state: `stored offline` for valid blobs, `original file` for currently authorized handles, `permission required` for retained handles without permission, and `audio missing` when no usable source exists.
- Removing a local Blob while retaining a library entry is allowed only when there is another retained source/handle. Because the current `Source` shape holds either Blob or handle, v3 expands it to allow both so “remove offline copy” can safely fall back to the original handle.
- Copying audio remains explicitly user-controlled. Folder import preserves copy/reference choice, and per-track/bulk “Save for offline” converts authorized references to retained blobs while preserving the handle.
- Browser storage is described as quota-limited and potentially evictable even when persistence is granted.

## Phase 1 — Domain model, normalization, and IndexedDB v3

### `src/models.ts`

Add backward-compatible fields and types:

- `Track.genres?: string[]`
- `Track.moodTags?: string[]`
- Extend `Source` to permit both `blob?: Blob` and `handle?: FileSystemFileHandle` simultaneously.
- Stable `RecommendationPurpose` union for the eight IDs.
- `RecommendationWeights` for mood-tag match, genre match, explicit profile match, direct feedback, feedback similarity, favorite, play count, recency/rediscovery, and time-of-day history.
- `RecommendationProfile`: purpose, target size, preferred genres/tags, partial weight overrides.
- `RecommendationFeedback`: stable ID derived from purpose + track, purpose, track ID, affinity `1 | -1`, updated timestamp.
- `RecommendationSettings`: excluded track IDs and per-purpose refresh seeds.
- Small install/onboarding preferences added to `Preferences` as optional fields with defaults so older records remain valid.
- `TrackAvailability` union for `stored`, `original`, `permission-required`, and `missing` display/service results; do not persist a redundant status when it can be derived.

Create one bounded normalization helper for genre/tag lists: sanitize with existing text cleaning, trim/collapse whitespace, remove empties, case-insensitive dedupe while preserving first display spelling, cap item length and list length. Use it at import, edit, restore, and profile-write boundaries.

### `src/storage.ts`

Upgrade database version from 2 to 3 without deleting or rewriting existing user records.

Create stores:

- `recommendationProfiles`, keyed by purpose ID.
- `recommendationFeedback`, keyed by stable feedback ID.

Extend `settings` values to include recommendation settings while preserving existing preferences/session keys.

Add focused APIs:

- load/save/reset recommendation profile.
- load/upsert/remove feedback.
- load/update recommendation settings and refresh seeds.
- get a track/source availability snapshot without loading audio data into React state.
- save an offline Blob while retaining an existing handle.
- remove an offline Blob only when a handle remains; otherwise require removing/relinking the track instead.
- calculate copied-audio totals by reading source metadata/Blob sizes on demand for Settings.

`loadLibrary()` returns recommendation state in addition to existing records. It should check reference permissions defensively, but distinguish denied/prompt permission from a truly absent source; it must not silently discard handles or blobs.

`removeTrack()` transactionally removes the track, source, artwork, playlist references, recommendation feedback, and the track ID from exclusions. Listening events retain the existing project behavior unless separately cleared. `clearDatabase()` clears every v3 store.

Handle `QuotaExceededError`, unavailable storage, and malformed stored recommendation records through bounded defaults and existing `storageMessage()` patterns. Never reset the database as recovery.

### `src/importer.ts`

- Read `metadata.common.genre` exactly when present; normalize it; never infer genres from filenames/folders/artists.
- Preserve handles when making a copied import from the File System Access flow so a user can later remove the copy and return to the original reference.
- Refactor source resolution to return/throw typed availability failures so UI and playback can distinguish permission-required from missing/undecodable.
- Request file permission only from a user gesture (`relink`, `grant access`, `save for offline`), never during passive app startup.

### `src/backup.ts`

Introduce backup v2 while accepting v1:

- v2 includes genres/tags, recommendation profiles, recommendation feedback, and recommendation settings.
- Audio blobs and handles remain excluded.
- Validate known purposes, finite bounded weights, affinities, timestamps, text/list limits, unique IDs, and referenced tracks.
- v1 imports treat new fields/state as empty/default.
- Restore remaps feedback/exclusions through fingerprint-based track ID mapping, drops dangling records, merges profiles by purpose, resolves feedback conflicts by newest `updatedAt`, unions valid exclusions, and preserves existing audio/source records.
- Backup restore cannot overwrite a usable local Blob/handle with metadata-only state.

## Phase 2 — Pure local recommendation engine

### `src/recommendations.ts`

Replace the six-mode sorter with a browser-independent pure service. Scoring/generation must not read React, IndexedDB, `Date.now()`, network state, or other browser globals directly.

Export:

- metadata for the eight purposes, including visible descriptions and disclosed genre/tag associations.
- default purpose profiles and conservative default weights.
- `scoreTrack(track, context)` returning a score plus signed, labeled reason records, or `null` when ineligible.
- `generateSmartPlaylist(request)` returning selected entries, eligible count, requested count, and typed limitation information.
- a local provider implementation behind a small recommendation-provider interface (`kind: "local"`). Keep the interface ready for a future optional remote provider, but do not add network code or credentials.

Scoring pipeline:

1. Hard-filter missing/unavailable, excluded, duplicate ID, and duplicate fingerprint records.
2. Normalize actual stored genres/tags.
3. Score exact case-insensitive purpose profile tag/genre overlap.
4. Score explicit preferred genre/tag matches.
5. Apply direct purpose feedback.
6. Apply feedback similarity only through real shared tags, genres, or artist; no fabricated similarity.
7. If personalization is enabled and the track already has purpose evidence, apply bounded favorite, logarithmic play-count, recency/rediscovery, and time-window signals.
8. Late-night uses actual event start hours 22:00–04:59. Nostalgic uses explicit tags/preferences first and a small rediscovery signal; file age is not nostalgia.
9. Apply a tiny deterministic seeded tie-break that cannot overtake meaningful score differences.
10. Sort stably, then enforce adjacent-artist avoidance and an artist cap of max(2, 20% of requested size) when alternatives exist. Relax only the artist cap for a genuinely small matching pool.

An unrelated favorite/popular track is never eligible solely due to behavior. Missing metadata receives no guessed mood evidence. Explanations come from the engine rather than being reconstructed by the UI.

## Phase 3 — React state and smart-playlist UI

### `src/state.tsx`

Extend provider state with profiles, feedback, settings, and source availability summaries. Add narrow async actions for:

- save/reset a profile.
- set/clear more-or-less feedback.
- exclude/restore a track.
- increment a purpose refresh seed.
- edit title/artist/album/genres/mood tags.
- save selected references as offline copies.
- remove an offline copy only when fallback access remains.
- request/recheck file permission after a user gesture.

Use the current mutation/error/toast/BroadcastChannel flow. Keep playlist drafts in component state, not IndexedDB. Ensure playback’s track list refresh remains synchronized.

### `src/components/TrackList.tsx`

- Extend the existing edit modal with comma-separated Genre and Mood/activity tag fields.
- Display concise, honest source status in track options and near unavailable tracks.
- Add contextual `Save for offline`, `Grant access`, `Relink audio file`, and `Remove offline copy` actions according to actual source state.
- Do not silently skip unavailable tracks when the user directly selects them.

### `src/pages/Discover.tsx`

Rebuild the existing route as a responsive smart-playlist builder:

1. Eight accessible purpose controls with `aria-pressed`.
2. Target size, preferred genre/tag inputs, behavior-personalization status, and an Adjust rules modal with labeled kit sliders.
3. Local generate/refresh action; refresh increments only the local purpose seed.
4. Draft preview with result count, limitation notice, Play preview, and top engine-provided reasons.
5. Reversible More like this / Less like this / Exclude controls and an Excluded tracks management modal.
6. Draft editing: remove, move up/down, and add a real library track through searchable selection. Manual additions are labeled and do not claim rule matches.
7. Save modal with validated name/description. Save through the existing playlist action in exact draft order and navigate to normal playlist detail.

Keep manual additions/removals stable while ordinary profile/feedback recomputation occurs. An explicit Regenerate replaces generated entries and asks before discarding edits that cannot be retained. Maintain separate drafts per purpose for the current session.

Empty-library and no-match states are distinct. No-match explains that AURA will not guess and directs users to add real genres/tags or relax explicit filters.

### Styling/accessibility

Update `src/index.css` only with semantic existing tokens and established responsive patterns. Preserve all themes/materials. Use one level-one heading, visible labels, keyboard-operable controls, polite result-count status, focus restoration through kit/Radix modals, and no horizontal overflow at existing test widths.

## Phase 4 — PWA shell and connectivity architecture

### Dependencies and local assets

Update `package.json`/lockfile with:

- `vite-plugin-pwa` as a development dependency.
- local font packages for Manrope and Space Grotesk (or equivalent locally bundled WOFF2 assets selected at implementation time from package exports, not remote URLs).

Add purpose-built PNG PWA icons under `public/` at 192×192 and 512×512, plus a 512×512 maskable icon with safe-zone artwork. Keep the SVG favicon. Icons must be generated from AURA’s existing mark and colors, not external imagery.

### `vite.config.ts`

Configure `VitePWA` once:

- inject registration using prompt update behavior.
- manifest name `AURA — Local Music Player`, short name `AURA`, standalone display, theme/background colors aligned to the default dark shell, start URL and scope relative to Vite base, icon declarations including maskable purpose.
- Workbox precache for built HTML, JS, CSS, local fonts, icons, favicon, and essential static images.
- navigation fallback to base-aware `index.html`; denylist non-navigation assets and any future API paths.
- cleanup obsolete Workbox caches and claim clients only as part of the prompted update lifecycle.
- no broad runtime cache route. Same-origin immutable hashed assets are already precached; personal blobs remain in IndexedDB.

Adjust production CSP to self-only font/style sources after removing Google Fonts. Retain `media-src blob:` and `img-src blob: data:` for local playback/artwork.

### `src/main.tsx` and PWA update service

Add the virtual PWA client registration and expose a small hook/store for:

- service worker registered/offline-ready.
- update available.
- apply update.
- registration error.

Registration failure must not prevent normal online app startup. The update banner/toast must not force a reload while audio is playing; user confirmation triggers update and reload.

### Shared connectivity state

Add `src/connectivity.ts` with `useSyncExternalStore`-compatible state:

- initialize from `navigator.onLine`.
- transition to offline/online from browser events.
- briefly report reconnecting after returning online, then settle online.
- allow optional online services to report request failure separately as `feature-unavailable` without changing local core availability.

Do not probe a third-party endpoint just to infer connectivity. No core local action is gated by network state.

### `src/App.tsx`

- Replace the static “Local & private” top-bar label with an unobtrusive connection/install state that preserves the local-private message and announces Offline/Reconnecting only when relevant.
- Add an install action surfaced from the top bar/settings when `beforeinstallprompt` is available.
- Add non-disruptive offline-ready and update-ready notices using existing toast/banner primitives.
- Keep navigation, playback, queue, themes, and local recommendations fully enabled offline.
- Add a first-use modal/callout explaining initial online load/caching, local import/copy requirements, storage eviction limits, and browser-dependent file permissions/install support. Persist dismissal as a small preference.

If IndexedDB itself fails, preserve the existing recovery screen. The offline fallback is for uncached shell navigation failures, not a replacement for storage-error handling.

### Offline fallback

Add a lightweight same-origin `offline.html` under `public/`, styled without external dependencies. Precache it. Workbox navigation should normally serve the app shell; the fallback is used only when navigation cannot be fulfilled from shell/network. It must state that AURA needs one successful online load before offline use and provide Retry, without claiming user data is lost.

## Phase 5 — Offline audio management, settings, and playback honesty

### `src/pages/Settings.tsx`

Replace the outdated statement that no offline shell exists. Expand Device storage with:

- total origin usage/quota and persistence status.
- copied-audio count/estimated bytes.
- reference-only and permission-required counts.
- install status/action/instructions when supported.
- bulk `Save for offline` for reference tracks, preceded by exact total file-size estimate when handles can be read and the existing quota warning/confirmation flow.
- a management entry point for per-track offline copies; never bulk-delete automatically.
- explicit limitations: quotas are estimates, persistence is not a guarantee, private browsing/clearing site data can erase app storage, handles/permissions vary by browser/session.

Retain separate actions for listening-history deletion and full AURA reset. Cache cleanup must never be presented as music cleanup.

### `src/components/ImportDialog.tsx`

- Preserve review-before-import and local-only operation.
- In folder review, relabel copy/reference choices around offline availability and explain exact estimated selected size before copy.
- Keep `<input webkitdirectory>` fallback when File System Access is unavailable.
- Preserve selected handle when copying from `showDirectoryPicker` so storage can later fall back to the original after offline-copy removal.
- Make permission persistence caveats explicit without overstating permanence.

### `src/playback.ts`

- Resolve sources in priority order: valid local Blob, then authorized handle.
- On permission-required or missing source, surface a specific actionable error and stop on a directly chosen track. For automatic queue progression, continue only after recording/showing one consolidated unavailable status rather than repeated popups; never imply skipped tracks played.
- Do not mark a track permanently missing merely because its retained handle currently needs permission.
- Keep sleep timer timestamp-based. Add resume checks on `visibilitychange`, `pageshow`, and focus so an expired timer stops playback immediately after suspension; reschedule remaining timeout from `sleepEndsAt` rather than trusting the original timer.
- Preserve end-of-track mode and internal-navigation behavior. Do not claim exact background timing on all browsers.

## Phase 6 — Tests and production offline validation

### Unit tests

Add `tests/recommendations.test.ts` with fixed clocks/seeds covering:

- all eight purpose mappings.
- weight overrides and zero-disabled signals.
- personalization gating.
- feedback scope and real-metadata similarity only.
- exclusion, availability, ID/fingerprint dedupe.
- deterministic refresh/tie rotation.
- artist variety and small-pool relaxation.
- honest empty/insufficient/missing-metadata results.
- no mutation and only supplied IDs.

Expand `tests/storage.test.ts` for:

- v2→v3 migration preserving tracks, sources, playlists, events, settings, and artwork.
- recommendation stores/settings round-trip.
- source containing both Blob and handle shape where supported by fake IndexedDB fixtures.
- deletion cleanup and full clear.
- tag normalization.
- backup v2 round-trip and valid v1 compatibility.
- malformed purpose/affinity/weight/tag/dangling reference handling.
- restore ID remapping without audio loss.
- availability derivation and offline-copy removal guard.

Add focused sleep-timer tests by extracting timestamp/rescheduling calculations into pure helpers where necessary.

### Browser tests

Add focused Playwright coverage for:

- edit tags → purpose eligibility → explanations.
- feedback/exclusion persistence and restore.
- refresh, draft edits, preview, save order, and playlist navigation.
- install prompt UI using a mocked `beforeinstallprompt` event contract where browser-native prompt cannot be exercised.
- offline/online/reconnecting indicator transitions without local feature disabling.
- copied Blob playback after browser context goes offline.
- reference/permission-required status without silent success.
- playlists, theme, history/statistics, queue, and smart mixes across reload while offline.
- update-ready UI behavior with active playback where feasible.
- existing responsive/mobile/keyboard coverage.

### Production PWA acceptance run

This requirement cannot be proven against Vite dev mode. After code checks:

1. Run `pnpm build` and inspect generated manifest, service worker, Workbox assets, icon references, CSP, and base-prefixed URLs.
2. Use the repository/Figma-sanctioned deployment-preview procedure (invoke the deploy-preview skill during implementation) to serve the actual production build; do not start a second Vite development server.
3. Run Playwright/Chromium against that production URL in a fresh persistent context.
4. Online: load AURA, wait for service-worker control/offline-ready, import a generated WAV as a copied Blob, create playlist, favorite it, tag it, generate/save a local mood playlist, change theme, play long enough to create a listening event, and exercise sleep timer.
5. Set the browser context offline, close/reopen a page in the same context, and verify shell load, metadata, playlists, theme, stats, queue, local recommendations, and Blob playback.
6. Seed or import a reference-only track and verify it reports original/permission-required/unavailable honestly rather than pretending to play.
7. Return online and verify reconnect state settles without data loss.
8. Deploy/build a second application revision or trigger the update lifecycle, accept the update, and verify IndexedDB content survives.
9. Inspect Cache Storage and confirm it contains app assets only; inspect IndexedDB and confirm personal data/audio remain there.
10. Document install-banner/native installation checks that the available browser/CI cannot execute, especially Safari/iOS and OS-level installed-window behavior.

Do not declare offline support complete unless the production shell reopening test succeeds while the browser context is offline.

## Files expected to change

- `package.json`, `pnpm-lock.yaml`
- `vite.config.ts`
- `public/favicon.svg` plus new PWA icons and `public/offline.html`
- `src/main.tsx`
- `src/index.css`
- `src/models.ts`
- `src/storage.ts`
- `src/importer.ts`
- `src/backup.ts`
- `src/recommendations.ts`
- new `src/connectivity.ts`
- new PWA registration/install state module
- `src/state.tsx`
- `src/playback.ts`
- `src/App.tsx`
- `src/components/ImportDialog.tsx`
- `src/components/TrackList.tsx`
- `src/pages/Discover.tsx`
- `src/pages/Settings.tsx`
- new/expanded unit and browser tests

No backend, authentication, cloud sync, remote AI SDK, analytics, secrets, or arbitrary runtime caching is introduced.

## Implementation order and checkpoints

1. Models/normalization and IndexedDB v3 migration.
2. Storage/backup tests, including explicit migration preservation.
3. Pure recommendation engine and unit tests.
4. Provider actions, metadata editing, and smart-playlist builder.
5. Smart-playlist browser flow.
6. Source availability/offline-copy management and playback error semantics.
7. PWA dependency, local fonts/icons, manifest/service worker/CSP.
8. Connectivity/install/update/onboarding UI and Settings updates.
9. Sleep timer suspension/resume hardening.
10. Focused tests, full regression suite, then production offline acceptance run.

At each migration boundary, preserve existing data and avoid unrelated refactors.

## Verification commands

Use repository scripts exactly:

1. `pnpm format -- <changed files>`
2. Focused unit tests while iterating: `pnpm test -- tests/recommendations.test.ts tests/storage.test.ts <sleep-timer-test-file>`
3. Full unit suite: `pnpm test`
4. Production build: `pnpm build`
5. Focused browser specs: `pnpm test:browser -- <spec>` against the configured production test URL for PWA acceptance, then `pnpm test:browser`
6. Use the sanctioned production deploy-preview workflow for service-worker/offline checks; do not run another development server.

Report every actual pass/failure and any environment-limited OS installation checks separately.

## Completion criteria

- Existing user data survives IndexedDB v3 and app/service-worker updates.
- Eight local smart-playlist purposes are deterministic, explainable, configurable, editable, saveable, and functional offline.
- A valid base-aware manifest and one service worker make the production shell reopen offline after initial caching.
- Required UI fonts/icons/assets are local and cached; no Google Fonts request is required.
- Personal audio/data remain in IndexedDB, not Cache Storage.
- Users explicitly control audio copying and removal, see storage estimates/limits, and receive honest source/permission states.
- Library, search/sort, favorites, playlists, queue, local playback for available sources, sleep timer, statistics, themes, backups, and local recommendations remain available offline.
- Optional online features are not fabricated; unavailable online capabilities do not disable local features.
- Reconnection and prompted service-worker updates recover without data loss.
- Production-build offline reopen and local Blob playback are tested successfully before the feature is called complete.
