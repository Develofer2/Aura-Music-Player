# New Listening Canvas modes

## Context
The canvas has 5 modes today (Artwork, Vinyl, CD, Progress, Atmosphere), defined in `canvasModes` in `src/components/ListeningVisual.tsx` and typed as `CanvasMode` in `src/models.ts`. The user asked for more. Each new mode reuses the existing analyser (`player.analyser`), the seek-reactive `spin`/`positionRef` state, and the theme tokens (`--accent`, `--accent-secondary`).

## Recommended new modes (pick any)
1. **Cassette** – tape deck; reels turn with playback and the tape counter follows the position. Dragging a reel scrubs, like the disc.
2. **Turntable (full deck)** – vinyl plus a tonearm that sweeps inward as the song progresses; drag the arm to seek.
3. **Equaliser bars** – classic live spectrum bars with peak caps, driven by the analyser.
4. **Oscilloscope** – glowing waveform line from `getByteTimeDomainData`, accent-coloured.
5. **Lyrics-style focus** – large title/artist typography with a slow gradient that pulses to bass; minimal, good on phones.
6. **Aurora / Nebula** – soft drifting colour blobs from the cover's accent that swell with volume.
7. **Radio dial** – retro tuner; needle position equals track progress, drag to seek.
8. **Orbit** – cover art at the centre with particles orbiting at speeds tied to frequency bands.

Suggested first batch (best value, least effort): Cassette, Turntable deck, Equaliser bars, Aurora.

## Implementation pattern
- Add the name to `CanvasMode` (`src/models.ts`) and an entry (name, detail) to `canvasModes`, plus the mode list in `NowPlaying`'s `Select` in `src/components/Listening.tsx`.
- Add a `{selected === "X" && ...}` stage in `ListeningVisual.tsx`; analyser-driven modes use a `requestAnimationFrame` loop like the Progress bars.
- Styles in `src/index.css`; respect `.reduced-motion` and keep canvas draws light to avoid lag.

## Verification
`npx tsc --noEmit`, then switch each mode in the canvas on desktop and phone width and check play/pause, seeking and theme changes.

## Scope update (user feedback): build ALL 8 modes + customization + nature themes

### Canvas modes
Build all eight: Cassette, Turntable deck, Equaliser bars, Oscilloscope, Typographic focus, Aurora/Nebula, Radio dial, Orbit. Seek-aware ones (Cassette, Turntable, Radio dial) reuse the pointer-drag scrub in `grab()` in `ListeningVisual.tsx`.

### Canvas customization
Add `canvas?: { intensity: number; speed: number; palette: "theme" | "cover" | "rainbow"; showLabels: boolean; fullscreenBg: boolean }` to `Preferences` (`src/models.ts`, defaults in `defaults`, whitelisted in `src/backup.ts`). Add a "Customize" popover/section in `NowPlaying` (`src/components/Listening.tsx`) with sliders (intensity, speed), palette select and toggles; expose values as CSS variables (`--canvas-intensity`, `--canvas-speed`) on `.listening-visual` and read them in the analyser loops.

### Nature themes
Add to `themes` in `src/themes.ts` (each with bg/surface/accent/secondary/text/muted, `background: "gradient"`, `motion: "gentle"`), extend `material` union with `"nature"`, and add matching styles in `src/index.css` using existing `themeStyle`/`data-material` hooks:
- Forest Dawn (deep green, moss, golden light)
- Ocean Tide (teal/navy, foam)
- Sakura Garden (soft pink, bark brown)
- Desert Dusk (terracotta, sand, violet sky)
- Rain Window (slate blue, silver)
- Alpine Snow (light mode: ice white, pine green)
- Lavender Field (purple, sage)
- Autumn Leaves (amber, rust, plum)
Check contrast with the existing `contrast`/`accessibleAccent` helpers; add the ids to any theme-id tests.

### Order of work
1) models/preferences + customization plumbing, 2) nature themes, 3) modes in two batches (seek-aware, then analyser-driven), 4) `npx tsc --noEmit`, `npx vitest run`, `npx vite build`, and a manual pass on desktop and phone widths.
