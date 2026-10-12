/** Theme picker, custom theme editor and theme import/export. Copyright (c) 2026 Develofer2. MIT License. */
import { useState } from "react"
import {
  Check,
  Download,
  Upload,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  Copy,
  Sparkles,
} from "lucide-react"
import { Button, Field, Heading, Modal, Select } from "../components/ui"
import { useAura } from "../state"
import { themes, themeStyle, validTheme, contrast } from "../themes"
import { canvasModeIds, type CanvasMode, type Theme } from "../models"
import { canvasModes } from "../components/ListeningVisual"
import { downloadJSON } from "../backup"
export default function Appearance({
  preview,
}: {
  preview: (theme?: Theme) => void
}) {
  const aura = useAura(),
    [editor, setEditor] = useState(false),
    [draft, setDraft] = useState<Theme>(themes[0])
  const all = [
    themes.find((t) => t.id === "glass")!,
    ...themes.filter((t) => t.id !== "glass"),
    ...aura.prefs.customs,
  ]
  function edit(theme: Theme) {
    const value = {
      ...theme,
      id: theme.id.startsWith("custom-")
        ? theme.id
        : `custom-${crypto.randomUUID()}`,
      name: theme.id.startsWith("custom-") ? theme.name : "My AURA",
    }
    setDraft(value)
    preview(value)
    setEditor(true)
  }
  function change(patch: Partial<Theme>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    preview(next)
  }
  function close() {
    setEditor(false)
    preview(undefined)
  }
  async function save() {
    if (!validTheme(draft)) {
      aura.notify("Please provide a name and valid six-digit colors.")
      return
    }
    if (
      [draft.bg, draft.surface].some(
        (bg) =>
          contrast(bg, draft.text) < 4.5 || contrast(bg, draft.muted) < 4.5,
      )
    ) {
      aura.notify(
        "Text and muted text need at least 4.5:1 contrast against the canvas and surface. Adjust the colors before saving.",
      )
      return
    }
    await aura.preferences({
      customs: [...aura.prefs.customs.filter((t) => t.id !== draft.id), draft],
      theme: draft.id,
    })
    close()
  }
  async function importTheme(file?: File) {
    if (!file) return
    try {
      if (file.size > 100000) throw new Error("Theme file is too large.")
      const t: unknown = JSON.parse(await file.text())
      if (!validTheme(t))
        throw new Error(
          "Invalid AURA theme. Colors must be six-digit hex values.",
        )
      if (
        [t.bg, t.surface].some(
          (bg) => contrast(bg, t.text) < 4.5 || contrast(bg, t.muted) < 4.5,
        )
      )
        throw new Error(
          "This theme needs higher text contrast (at least 4.5:1).",
        )
      const value = { ...t, id: `custom-${crypto.randomUUID()}` }
      await aura.preferences({ customs: [...aura.prefs.customs, value] })
      aura.notify("Theme imported. Select it to apply.")
    } catch (e) {
      aura.notify(e instanceof Error ? e.message : "Theme import failed.")
    }
  }
  return (
    <div className="page">
      <div className="section-heading page-intro">
        <div>
          <span className="eyebrow">CHANGE THE FEELING</span>
          <Heading level={1}>
            A different atmosphere<span className="accent">.</span>
          </Heading>
          <p className="muted">Not just a new color. A whole new feeling.</p>
        </div>
        <Button
          variant="primary"
          onClick={() =>
            edit(all.find((t) => t.id === aura.prefs.theme) || themes[0])
          }
        >
          <Palette size={17} />
          Create your own
        </Button>
      </div>
      <div className="section-heading">
        <Heading>Nine places to get lost in.</Heading>
        <span className="small-label">APPLIES TO THE ENTIRE APP</span>
      </div>
      <div className="themes-grid">
        {all.map((t) => (
          <div
            className={`theme-card ${
              aura.prefs.theme === t.id ? "chosen" : ""
            }`}
            key={t.id}
          >
            <Button
              variant="ghost"
              className={`theme-preview material-${t.material || "studio"}`}
              style={themeStyle(t)}
              aria-label={`Apply ${t.name}`}
              onClick={() => void aura.preferences({ theme: t.id })}
            >
              <div className="theme-preview-sidebar">
                <div />
                <span />
                <span />
                <span />
              </div>
              <div className="theme-preview-main">
                <div className="theme-preview-line" />
                <div className="theme-preview-hero">
                  <div className="theme-mini-record" />
                  <span />
                </div>
                <div className="theme-preview-cards">
                  <div />
                  <div />
                  <div />
                </div>
              </div>
              {aura.prefs.theme === t.id && (
                <span className="theme-check">
                  <Check size={17} />
                </span>
              )}
            </Button>
            <div className="theme-caption">
              <div>
                <Heading level={3}>{t.name}</Heading>
                <span className="theme-material">
                  {t.material === "glass"
                    ? "FROSTED GLASS"
                    : t.material === "chrome"
                      ? "BRUSHED METAL"
                      : t.material === "analog"
                        ? "PAPER & GRAIN"
                        : t.material === "rainbow"
                          ? "PASTEL SPECTRUM"
                          : t.material === "anime"
                            ? "CEL-SHADED POP"
                            : t.material === "velvet"
                          ? "SOFT & WARM"
                          : t.material === "holographic"
                            ? "IRIDESCENT"
                            : t.material === "neon"
                              ? "ELECTRIC NEON"
                              : t.material === "aurora"
                                ? "AMBIENT LIGHT"
                                : t.material === "solar"
                                  ? "BOLD & GRAPHIC"
                                  : "CLEAN TECH"}
                </span>
                <p className="muted">
                  {t.description || "A world of your own."}
                </p>
              </div>
              <Button
                variant="ghost"
                aria-label={`Customize ${t.name}`}
                onClick={() => edit(t)}
              >
                <Palette size={17} />
              </Button>
            </div>
            {t.id.startsWith("custom-") && (
              <div className="custom-actions">
                <Button
                  variant="ghost"
                  onClick={() => downloadJSON(t, `${t.name}-theme.json`)}
                >
                  <Download size={14} />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void aura.preferences({
                      customs: [
                        ...aura.prefs.customs,
                        {
                          ...t,
                          id: `custom-${crypto.randomUUID()}`,
                          name: `${t.name} (Copy)`,
                        },
                      ],
                    })
                  }
                >
                  <Copy size={14} />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        "Delete this custom theme? Music and playlists are unaffected.",
                      )
                    )
                      void aura.preferences({
                        customs: aura.prefs.customs.filter(
                          (c) => c.id !== t.id,
                        ),
                        theme:
                          aura.prefs.theme === t.id
                            ? "midnight"
                            : aura.prefs.theme,
                      })
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="appearance-options chart-card">
        <div>
          <Heading>Your listening space</Heading>
          <p className="muted">Little details that make a big difference.</p>
        </div>
        <div className="settings-row">
          <div>
            <strong>Default listening canvas</strong>
            <p className="muted">Change it any time in the expanded player.</p>
          </div>
          <Select
            aria-label="Default canvas mode"
            value={aura.prefs.mode}
            onValueChange={(value) =>
              void aura.preferences({ mode: value as CanvasMode })
            }
          >
            {canvasModeIds.map((m) => (
              <option key={m} value={m}>
                {canvasModes.find((item) => item.mode === m)?.name}
              </option>
            ))}
          </Select>
        </div>
        <label className="settings-row">
          <div>
            <strong>Reduce motion</strong>
            <p className="muted">
              Keep things calm. System preferences are also respected.
            </p>
          </div>
          <Field
            type="checkbox"
            checked={aura.prefs.reducedMotion}
            onChange={(e) =>
              void aura.preferences({ reducedMotion: e.target.checked })
            }
          />
        </label>
        <label className="settings-row">
          <div>
            <strong>A little company</strong>
            <p className="muted">
              Show an original, decorative AURA companion.
            </p>
          </div>
          <Field
            type="checkbox"
            checked={aura.prefs.companion}
            onChange={(e) =>
              void aura.preferences({ companion: e.target.checked })
            }
          />
        </label>
      </div>
      <div className="hero-actions">
        <label className="button secondary">
          <Upload size={17} />
          Import theme
          <Field
            type="file"
            className="hidden"
            accept=".json,application/json"
            onChange={(e) => {
              void importTheme(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </label>
        <Button
          onClick={() =>
            void aura.preferences({
              theme: "glass",
              reducedMotion: false,
              companion: false,
              mode: "CD",
            })
          }
        >
          <RotateCcw size={16} />
          Reset appearance
        </Button>
      </div>
      <Modal
        open={editor}
        onClose={close}
        title="Create your own AURA"
        description="You’re seeing a live preview. Changes are saved only when you apply them."
      >
        <div className="form-stack">
          <label>
            Theme name
            <Field
              value={draft.name}
              maxLength={80}
              onChange={(e) => change({ name: e.target.value })}
            />
          </label>
          <label>
            Start from a preset
            <Select
              aria-label="Base preset"
              onValueChange={(value) => {
                const t = themes.find((t) => t.id === value)
                if (t) change({ ...t, id: draft.id, name: draft.name })
              }}
              defaultValue=""
            >
              <option value="" disabled>
                Choose a base...
              </option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="color-editor">
            {[
              { key: "bg", label: "Canvas" },
              { key: "surface", label: "Surface" },
              { key: "accent", label: "Accent" },
              { key: "text", label: "Text" },
              { key: "muted", label: "Muted text" },
            ].map(({ key, label }) => (
              <label key={key}>
                <Field
                  type="color"
                  aria-label={label}
                  value={draft[(key as keyof Theme)] as string}
                  onChange={(e) => change({ [key]: e.target.value })}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <label>
            Surface material
            <Select
              value={draft.material || "studio"}
              onValueChange={(value) =>
                change({ material: value as Theme["material"] })
              }
            >
              {[
                "studio",
                "glass",
                "neon",
                "solar",
                "holographic",
                "aurora",
                "analog",
                "chrome",
                "velvet",
                "rainbow",
                "anime",
              ].map((material) => (
                <option key={material} value={material}>
                  {material.charAt(0).toUpperCase() + material.slice(1)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Background style
            <Select
              value={draft.background || "solid"}
              onValueChange={(value) =>
                change({ background: value as Theme["background"] })
              }
            >
              <option value="solid">Solid</option>
              <option value="gradient">Subtle gradient</option>
              <option value="texture">Fine texture</option>
            </Select>
          </label>
          <label>
            Motion intensity
            <Select
              value={draft.motion || "full"}
              onValueChange={(value) =>
                change({ motion: value as Theme["motion"] })
              }
            >
              <option value="none">None</option>
              <option value="gentle">Gentle</option>
              <option value="full">Full</option>
            </Select>
          </label>
          <label className="check-label">
            <Field
              type="checkbox"
              checked={draft.rounded !== false}
              onChange={(e) => change({ rounded: e.target.checked })}
            />
            Rounded corners
          </label>
          <label className="check-label">
            <Field
              type="checkbox"
              checked={draft.glow !== false}
              onChange={(e) => change({ glow: e.target.checked })}
            />
            Soft accent glow
          </label>
          <p className="muted">
            Accent button text automatically adapts for contrast. Canvas and
            surface text must meet a 4.5:1 contrast ratio to save.
          </p>
          <div className="hero-actions">
            <Button variant="primary" onClick={() => void save()}>
              <Check size={17} />
              Save & apply
            </Button>
            <Button onClick={close}>Cancel preview</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
