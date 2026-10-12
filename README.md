# AURA

A free, local-first music player and reusable React UI kit.

Developed by **Develofer2**. Copyright (c) 2026 Develofer2. Released under the MIT
license (see `LICENSE`).

## Free to use

AURA is free. There are no accounts, payments or tracking. It is yours: use it,
change it, copy it, share it or build on it however you like, as if you made it
yourself. The only request of the license is to keep the copyright notice in
copies of the source.

## Architecture

- `src/main.tsx` mounts `src/App.tsx`, the shell that owns navigation and dialogs.
- `src/state.tsx` is the single provider for library data; it reads and writes
  IndexedDB through `src/storage.ts`.
- `src/playback.ts` is a singleton engine around one audio element (queue,
  shuffle/repeat, analyser, listening accounting).
- `src/importer.ts` and `src/backup.ts` handle everything that enters the app.
- `src/security.ts` holds the shared input checks (see below).
- `src/pages/` are route-level views; `src/components/` are shared UI;
  `src/themes.ts` maps presets to CSS variables used by `src/index.css`.
- `src/about.ts` is the one place for developer name, copyright and the user notice.

## Security

- Production builds ship a strict Content-Security-Policy (same-origin scripts
  only, no plugins, no external connections) and `no-referrer`.
- Audio imports are size-limited; embedded and chosen covers must be small
  PNG/JPEG/WebP/GIF/AVIF images (SVG is rejected).
- Text from tags, edits and backups has control and bidi characters removed and
  length capped; backup restore copies only known fields.
- Backups and theme files are size-limited and fully validated before use.
- Nothing is uploaded: audio, metadata and history stay in this browser.

## Implemented

- Audio-copy import with local metadata and artwork extraction, folder imports
  where supported, duplicate detection, optional authorized file references,
  cancellation, quota guidance, missing-source recovery and relinking.
- IndexedDB library, favorites, playlists, local covers, preferences, custom
  themes, listening events and paused queue/position restoration.
- One persistent audio element; seek, previous/next, volume/mute, shuffle,
  repeat, ordered queue controls, keyboard and optional Media Session controls.
- Search, filtering, sorting, album/artist views, list/grid modes, playlist
  creation/editing/duplication/order/deletion and track-removal Undo.
- Nine material-driven full-app presets, contrast-validated custom themes with live
  preview/cancel, color/background/corner/glow/motion options and theme JSON.
- Artwork, rotating vinyl/CD, honest progress display and Web Audio frequency
  ribbon visualization. An immersive responsive listening canvas and floating
  audio dock, reduced-motion preferences and an optional decorative companion.
- Real listening accumulation, once-per-session qualification, rankings and
  local-day activity; no fake music, plays, or charts.
- Versioned metadata backup validation/merge, storage estimates/protection,
  explicit clear-data confirmation, responsive navigation and accessible dialogs.
- Public kit primitives, interactive `KitPreview`, and guidelines.

## Storage and platform boundaries

Music never uploads. Every import saves a permanent audio copy in this browser,
for this origin, so you import once and it stays. Re-importing a file that is
marked missing reconnects it automatically (playlists and history are kept).
Storage may be cleared or evicted, including in private browsing. Requesting
persistent storage reduces eviction risk but is not a permanent-backup guarantee.
Keep your original files. Metadata backups exclude audio, cover images and file
permissions; restoring new tracks requires relinking.

File references and folder pickers require supporting browsers. Codec support
varies; accepting an extension does not guarantee successful decoding. Mobile
background playback depends on the browser/OS. Loading the app itself may require
network access; service-worker offline-shell caching is deliberately deferred.

Large-file duplicate fingerprints sample the first/last megabyte plus size to
bound memory; small files use full SHA-256. These identify likely duplicates,
not a proof of byte-for-byte identity for large files.

## Verification

Use the supervised development server, not a second Vite process.

```
pnpm run format
pnpm exec tsc --noEmit
pnpm run test
pnpm run test:browser
pnpm run build
pnpm run build:lib
```

Browser tests generate their own tone WAVs (no copyrighted fixtures) and connect
to port 3000 by default. Use `AURA_TEST_URL` for another supervised-server URL.
Install the test browser once with `pnpm exec playwright install chromium`.
The automated suite targets Chromium; Safari/Firefox, real-device background
audio, file-reference permission renewal and real quota eviction still require
manual browser/device acceptance testing.

## Kit API

`src/index.ts` exports Button, IconButton, Field, Select, Heading, Slider, Modal,
Artwork, KitPreview, theme presets/utilities and visual theme types. It does not
export the app's playback or private storage. See `guidelines/` for usage.
