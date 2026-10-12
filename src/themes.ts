/** Theme presets, validation, CSS variable mapping and contrast utilities. Copyright (c) 2026 Develofer2. MIT License. */
import type { Theme } from "./models"
export const themes: Theme[] = [
  {
    id: "midnight",
    name: "Midnight Studio",
    description: "After hours. In your element.",
    bg: "#0c1017",
    surface: "#151b24",
    accent: "#78e3ff",
    text: "#f0f3f8",
    muted: "#939dad",
    material: "studio",
    secondary: "#a995ff",
  },
  {
    id: "neon",
    name: "Neon Bloom",
    description: "A little electric. A lot of feeling.",
    bg: "#190f1c",
    surface: "#28192c",
    accent: "#ff8bd5",
    text: "#fff0fa",
    muted: "#baa0ba",
    material: "neon",
    secondary: "#c7a0ff",
  },
  {
    id: "solar",
    name: "Solar Pop",
    description: "Turn up the golden hour.",
    bg: "#18150f",
    surface: "#27231a",
    accent: "#ffd17a",
    text: "#fff8e9",
    muted: "#b5aa96",
    material: "solar",
    secondary: "#ff9d6c",
  },
  {
    id: "holo",
    name: "Holographic",
    description: "Somewhere beyond the ordinary.",
    bg: "#111126",
    surface: "#1c1d36",
    accent: "#b9afff",
    text: "#f4f1ff",
    muted: "#a29fbe",
    material: "holographic",
    secondary: "#7de5ff",
  },
  {
    id: "aurora",
    name: "Aurora Drift",
    description: "Find your softer frequency.",
    bg: "#0c1915",
    surface: "#142820",
    accent: "#99e5b8",
    text: "#effaf4",
    muted: "#95b0a1",
    material: "aurora",
    secondary: "#72d6cc",
  },
  {
    id: "analog",
    name: "Analog Soul",
    description: "Warm tones. Timeless sounds.",
    bg: "#f3ede3",
    surface: "#e8dfd2",
    accent: "#8c412a",
    text: "#322a24",
    muted: "#6d5f54",
    material: "analog",
    secondary: "#a86b42",
  },
  {
    id: "glass",
    name: "Glass House",
    description: "Frosted layers. A different kind of clarity.",
    bg: "#0b1220",
    surface: "#19253b",
    accent: "#ceecff",
    text: "#f3f7ff",
    muted: "#b0bed3",
    secondary: "#b7a4ff",
    material: "glass",
    background: "gradient",
  },
  {
    id: "chrome",
    name: "Chrome FM",
    description: "Liquid metal meets acid green.",
    bg: "#111311",
    surface: "#20241e",
    accent: "#d5ff86",
    text: "#f2f5ef",
    muted: "#a5b09e",
    secondary: "#c9d2dd",
    material: "chrome",
    rounded: false,
  },
  {
    id: "velvet",
    name: "Velvet Room",
    description: "Soft peach. Deep plum. Slow evenings.",
    bg: "#20151b",
    surface: "#32232b",
    accent: "#ffc6a5",
    text: "#fff3ed",
    muted: "#c7adb8",
    secondary: "#dd92b9",
    material: "velvet",
    motion: "gentle",
  },
  {
    id: "rainbow",
    name: "Soft Rainbow",
    description: "Pastel spectrum on warm cloud white.",
    bg: "#fbf8ff",
    surface: "#ffffff",
    accent: "#8b7cf6",
    text: "#2b2540",
    muted: "#7d7596",
    secondary: "#f58fb7",
    material: "rainbow",
    background: "gradient",
  },
  {
    id: "anime",
    name: "Sakura Night",
    description: "Midnight city, cherry blossom glow, cel-shaded pop.",
    bg: "#14122b",
    surface: "#211d45",
    accent: "#ff7eb6",
    text: "#fff6fb",
    muted: "#b3abd9",
    secondary: "#6fe3ff",
    material: "anime",
    background: "gradient",
  },
  {
    id: "rainbow-dark",
    name: "Midnight Rainbow",
    description: "Pastel spectrum glowing in the dark.",
    bg: "#15121f",
    surface: "#231e33",
    accent: "#b3a4ff",
    text: "#f6f2ff",
    muted: "#a69fc0",
    secondary: "#ff9cc7",
    material: "rainbow",
    background: "gradient",
  },
  {
    id: "anime-tokyo",
    name: "Tokyo Drift",
    description: "Rain-soaked neon streets after midnight.",
    bg: "#0e1020",
    surface: "#1a1d3a",
    accent: "#ff4f8b",
    text: "#f5f7ff",
    muted: "#9aa3d6",
    secondary: "#36e0c8",
    material: "anime",
    background: "gradient",
  },
  {
    id: "anime-shoujo",
    name: "Shoujo Sparkle",
    description: "Dreamy lavender and strawberry milk.",
    bg: "#2a1a3f",
    surface: "#3d2759",
    accent: "#ffb3d9",
    text: "#fff5fc",
    muted: "#cdb4e6",
    secondary: "#ffe27a",
    material: "anime",
    background: "gradient",
  },
  {
    id: "anime-mecha",
    name: "Mecha Sunrise",
    description: "Orange horizon over a steel hangar.",
    bg: "#111827",
    surface: "#1e2a3f",
    accent: "#ff9f43",
    text: "#fff7ec",
    muted: "#a5b4c9",
    secondary: "#4cc9f0",
    material: "anime",
    background: "gradient",
  },
]
export const natureThemes: Theme[] = [
  {
    id: "nature-forest",
    name: "Forest Dawn",
    description: "Moss, pine and the first gold light.",
    bg: "#0d1a13",
    surface: "#16271d",
    accent: "#9be37a",
    text: "#eef6e9",
    muted: "#90a88f",
    secondary: "#f2c76b",
    material: "nature",
    background: "gradient",
    motion: "gentle",
  },
  {
    id: "nature-ocean",
    name: "Ocean Tide",
    description: "Deep teal water and white foam.",
    bg: "#08171f",
    surface: "#10262f",
    accent: "#5fd7d0",
    text: "#eaf8f8",
    muted: "#86a5ab",
    secondary: "#8fb8ff",
    material: "nature",
    background: "gradient",
    motion: "gentle",
  },
  {
    id: "nature-sakura",
    name: "Sakura Garden",
    description: "Petals drifting over dark bark.",
    bg: "#1d1416",
    surface: "#2b1d21",
    accent: "#ffb1c4",
    text: "#fff1f4",
    muted: "#b99ba3",
    secondary: "#c9d9a0",
    material: "nature",
    background: "gradient",
    motion: "gentle",
  },
  {
    id: "nature-desert",
    name: "Desert Dusk",
    description: "Terracotta sand under a violet sky.",
    bg: "#1d1316",
    surface: "#2d1d1f",
    accent: "#ff9a62",
    text: "#fff1e6",
    muted: "#bb9a8c",
    secondary: "#b79bff",
    material: "nature",
    background: "gradient",
    motion: "gentle",
  },
  {
    id: "nature-rain",
    name: "Rain Window",
    description: "Slate sky, silver drops, slow evening.",
    bg: "#10151c",
    surface: "#1a222c",
    accent: "#a9c7e8",
    text: "#eef3f9",
    muted: "#8c9aab",
    secondary: "#7fd1c0",
    material: "nature",
    background: "gradient",
    motion: "gentle",
  },
  {
    id: "nature-alpine",
    name: "Alpine Snow",
    description: "Fresh snow and a line of pine.",
    bg: "#eef4f7",
    surface: "#ffffff",
    accent: "#1f6b4f",
    text: "#14232b",
    muted: "#5d727c",
    secondary: "#3a86b5",
    material: "nature",
    background: "gradient",
    motion: "gentle",
  },
  {
    id: "nature-lavender",
    name: "Lavender Field",
    description: "Purple rows and sage hills.",
    bg: "#171322",
    surface: "#241d36",
    accent: "#c5a6ff",
    text: "#f5f0ff",
    muted: "#a498c0",
    secondary: "#a8d5a2",
    material: "nature",
    background: "gradient",
    motion: "gentle",
  },
  {
    id: "nature-autumn",
    name: "Autumn Leaves",
    description: "Amber, rust and plum.",
    bg: "#1b120f",
    surface: "#2a1c17",
    accent: "#ffb347",
    text: "#fff2e3",
    muted: "#b9998a",
    secondary: "#d9627a",
    material: "nature",
    background: "gradient",
    motion: "gentle",
  },
]
themes.push(...natureThemes)
export function validTheme(value: unknown): value is Theme {
  if (!value || typeof value !== "object") return false
  const t = value as Theme
  return (
    typeof t.id === "string" &&
    t.id.length < 100 &&
    typeof t.name === "string" &&
    !!t.name.trim() &&
    t.name.length <= 80 &&
    ["bg", "surface", "accent", "text", "muted"].every((k) =>
      /^#[0-9a-f]{6}$/i.test(String(t[(k as keyof Theme)])),
    ) &&
    (t.background === undefined ||
      ["solid", "gradient", "texture"].includes(t.background)) &&
    (t.motion === undefined || ["none", "gentle", "full"].includes(t.motion)) &&
    (t.secondary === undefined || /^#[0-9a-f]{6}$/i.test(t.secondary)) &&
    (t.material === undefined ||
      [
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
        "nature",
      ].includes(t.material))
  )
}
export function themeStyle(t: Theme) {
  return {
    "--bg": t.bg,
    "--surface": t.surface,
    "--accent": t.accent,
    "--text": t.text,
    "--muted": t.muted,
    "--accent-secondary": t.secondary || t.accent,
    "--panel": `color-mix(in srgb, ${t.surface} ${
      t.material === "glass" ? "58%" : "78%"
    }, transparent)`,
    "--panel-solid": t.surface,
    "--line": `color-mix(in srgb, ${t.text} ${
      t.material === "glass" ? "16%" : "10%"
    }, transparent)`,
    "--scene-blur":
      t.material === "glass"
        ? "24px"
        : t.material === "holographic"
          ? "16px"
          : "8px",
    "--radius": t.rounded === false ? "4px" : "16px",
    "--glow": t.glow === false ? "0" : ".13",
  } as React.CSSProperties
}
export function accessibleAccent(color: string) {
  const values = [1, 3, 5]
    .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722 > 0.179
    ? "#101719"
    : "#ffffff"
}
export function contrast(a: string, b: string) {
  const luminance = (color: string) => {
    const v = [1, 3, 5]
      .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722
  }
  const l1 = luminance(a),
    l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
