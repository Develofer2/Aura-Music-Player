# AURA kit setup

React 19, TypeScript, Vite 8 and Tailwind v4. The existing supervised server owns
preview; do not start another development server.

Import `src/index.css` once before composing `Button`, `Field`, `Modal` and other
primitives from `src/index.ts`. Use `themeStyle(themes[0])` on your themed root and
`accessibleAccent(theme.accent)` for `--accent-ink`. Portal tokens must also be
applied to the document root. Use `KitPreview` for an interactive component catalog.

The kit imports public Manrope and Space Grotesk in `src/index.css`, with system
fallbacks when offline. Analog Soul uses an offline-available Georgia serif.
Lucide supplies icons; Radix Dialog supplies accessible modal behavior. Private
library storage and the playback engine are intentionally not public kit APIs.

Verification:

```
pnpm run format
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm exec playwright test
pnpm run build
pnpm run build:lib
```

Browser tests use the supervised app at port 3000 in this environment.
Set `AURA_TEST_URL` if the existing server uses a different URL.
Run `pnpm exec playwright install chromium` once to obtain the test browser.
