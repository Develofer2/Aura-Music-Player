# AURA components

Import the kit's public primitives from `src/index.ts` (or the published kit package).
`KitPreview` is an interactive specimen of every control, including disabled actions,
form fields, artwork and a dialog. It does not require the application provider.

- **Button**: `variant="primary" | "secondary" | "ghost" | "danger"`; standard button
  attributes. Primary is for the single highest-priority action; danger for removal.
- **IconButton**: required `label` supplies both accessible name and tooltip.
  Standard button attributes; use `aria-pressed` for toggle controls.
- **Field**: native input attributes; use a visible wrapping label or `aria-label`.
  Supports text, checkbox, color, range and file types.
- **Select**: controlled `value`/`onValueChange`, optional `defaultValue`, `name`,
  `disabled` and `required`, plus option children. Radix Select provides a themed
  popup, collision-aware positioning, keyboard navigation, typeahead and focus
  restoration. Empty-value disabled options serve as placeholder text. Provide
  a visible wrapping label or `aria-label`; selection callbacks receive a string.
  Optional `icon` supports compact icon-only presentation while retaining the
  selected value and accessible combobox name.
- **Slider**: required `label`, native range properties. Always provide min/max and
  step; disabled when the associated value is not available.
- **Heading**: `level={1 | 2 | 3}`, children, optional className. One level-one heading
  per screen; use semantic order rather than choosing levels for visual size.
- **Artwork**: optional local source `id`, `title`, `className`. Loads only artwork,
  never audio. URLs are revoked on unmount. No source gives an original fallback.
- **Modal**: controlled `open`, `onClose`, `title`, optional `description`, children.
  Radix supplies focus trapping, Escape, accessible naming and focus restoration.
  Optional `className` extends the content surface without changing these behaviors.
  Defaults to modal behavior; `modal={false}` is reserved for dismissible navigation
  panels that keep the header interactive. `onCloseAutoFocus` supports explicit
  focus restoration when triggers are outside the dialog component.
- **KitPreview**: standalone interactive examples for kit review.

Raw control elements are confined to primitive implementation. Screens compose
these primitives, Lucide icons and semantic layout sections.

Pointer clicks do not leave focus outlines. Keyboard navigation keeps a visible
theme-colored focus indicator. Hover feedback is a brief surface transition.
