# AURA semantic tokens

`src/index.css` defines the kit's scale. `src/themes.ts` defines nine presets and
`themeStyle(theme)` maps a validated theme into CSS custom properties.

- `--bg`: app canvas; `--surface`: controls, cards, dialogs.
- `--text`: primary content; `--muted`: supporting text.
- `--accent`: selected state, primary action, focus and playback signal.
- `--accent-secondary`: theme-specific prism/ribbon highlight.
- `--panel`: translucent material surface; `--panel-solid`: dialog/dock base.
- `--scene-blur`: material-dependent backdrop blur (strongest for Glass House).
- `--font-body`, `--font-display`: Manrope UI and Space Grotesk display/readouts.
- `--accent-ink`: foreground computed for contrast on accent backgrounds.
- `--line`: subtle theme-relative separators; `--hover`: hover surface.
- `--danger`: removal/error only; never decorative.
- `--radius`: base shape; component radii derive from it.
- `--s1` through `--s10`: shared spacing scale (4–64).
- `--text-xs/sm/md/lg`, `--heading-sm/md/lg`: type hierarchy.
- `--control-size`: desktop control target; preserve accessible touch size.
- `--control-font`, `--control-hover`: readable control labels and smooth hover.
- `--scroll-thumb`, `--scroll-track`: theme-derived scrollbar treatment.
- `--menu-min-width`, `--menu-max-height`: collision-contained Select popup sizing.
- `--sidebar-width`, `--player-height`, `--bar-height`: shell dimensions with
  responsive overrides.

Use `var(--token)` in component CSS. Theme configuration and original decorative
artwork are allowed to define base color values. Do not hardcode theme colors in
screen components. Custom themes validate color syntax and minimum text contrast.
