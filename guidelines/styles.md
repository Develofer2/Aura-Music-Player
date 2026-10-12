# AURA visual language

Music-first, immersive and personal. Glass House is the default for new libraries:
cool frosted layers over a restrained blue/violet atmosphere. Existing saved
themes remain selected. Nine presets change the entire app, including portals.
Materials are intentionally different: glass, clean tech, electric neon, graphic
amber, iridescence, ambient green, warm paper, brushed chrome and soft velvet.

Typography uses Manrope for UI and Space Grotesk for headings/readouts, imported
at the top of `src/index.css`. Analog Soul uses Georgia for editorial headings.
System fallbacks remain available if font downloads fail. Use tabular numerals
for timelines. Keep labels and icons optically aligned; do not stretch tracking.

- Desktop: fixed sidebar, thin top bar, constrained content and persistent player.
- Tablet: icon rail below 900px, retaining readable content width.
- Mobile: five-item bottom navigation, mini-player above it, menu for Settings,
  full-width content and viewport-contained dialogs. Respect safe-area insets.
- Compose an asymmetric listening room, not a grid of generic onboarding cards.
  Frosted panels use theme tokens and thin highlights. Shadows belong mostly to
  the sculptural artwork, floating audio dock, feedback and dialogs.
- The player includes a real circular progress ring, reflective CD, vinyl with
  local artwork, an honest stylized progress view, and real audio-driven ribbons.
- Motion is brief for interactions and slow for decorative art, never a delay
  before controls become usable. Audio rotation only runs during playback.
- Keep a clear title, supporting line and primary action per screen.
- Blank libraries and statistics use honest empty states, never sample songs.
- Player progress is sourced from audio events. Atmosphere is real frequency data.
- Rotation pauses with audio and stops for system/user reduced-motion settings.
- Provide accessible names, visible focus, native keyboard behavior and plain
  language recovery messages. Destructive actions explain their scope.
- Controls keep readable type and reserve separate space for icons/chevrons.
  Toolbars reflow into rows on compact layouts instead of shrinking labels.
- Select popups, hover surfaces and thin scrollbars use the active theme's tokens;
  avoid browser-owned blue menus, scrollbar arrows and nested search-field boxes.
- Keyboard-only focus remains visible; pointer clicks leave no persistent ring.
- Compact headers use a circular palette-icon theme picker. The header stays
  sticky, safe-area aware and reachable above the dismissible mobile navigation
  panel. Navigation links scroll inside the panel; its close and Import controls
  remain visible, including on short landscape screens.
- Phone layouts hide scrollbar graphics but retain touch/wheel scrolling.
  Desktop layouts keep the theme-colored thin scrollbar.
