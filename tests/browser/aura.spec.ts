import { test, expect } from "@playwright/test"
import { chooseOption } from "./helpers"
function wav(seconds = 8) {
  const rate = 8000,
    count = rate * seconds,
    b = Buffer.alloc(44 + count * 2)
  b.write("RIFF")
  b.writeUInt32LE(b.length - 8, 4)
  b.write("WAVE", 8)
  b.write("fmt ", 12)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(rate, 24)
  b.writeUInt32LE(rate * 2, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write("data", 36)
  b.writeUInt32LE(count * 2, 40)
  for (let i = 0; i < count; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * Math.PI * 2 * 220) * 4000),
      44 + i * 2,
    )
  return b
}
test("real WAV persists, plays, qualifies once and resumes paused", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Your listening room" }),
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Import your music", exact: true })
    .click()
  await page
    .locator("#audio-import")
    .setInputFiles({ name: "Signal.wav", mimeType: "audio/wav", buffer: wav() })
  await expect(page.getByText("1 saved.", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: "Close dialog" }).click()
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Your library" })
    .click()
  await page
    .getByRole("button", { name: "Favorite Signal", exact: true })
    .click()
  await page.getByRole("button", { name: "Play Signal", exact: true }).click()
  await expect(
    page
      .locator(".mini-controls")
      .getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible()
  await expect
    .poll(async () =>
      page.locator(".mini-controls input[type=range]").inputValue(),
    )
    .not.toBe("0")
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Home", exact: true })
    .click()
  await page.waitForTimeout(4800)
  await page
    .locator(".mini-controls")
    .getByRole("button", { name: "Pause", exact: true })
    .click()
  await page.reload()
  await expect(page.locator(".mini-track strong")).toHaveText("Signal")
  await expect(
    page
      .locator(".mini-controls")
      .getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible()
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Your library" })
    .click()
  await expect(
    page.getByRole("button", { name: "Favorite Signal", exact: true }),
  ).toHaveClass(/active/)
  await page.getByRole("button", { name: "Options for Signal" }).click()
  await expect(page.getByText(/1 qualified plays/)).toBeVisible()
  await page.getByRole("button", { name: "Close dialog" }).click()
  await page
    .locator(".mini-controls")
    .getByRole("button", { name: "Play", exact: true })
    .click()
  await expect(
    page
      .locator(".mini-controls")
      .getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
test("playlists and all-app appearance persist", async ({ page }) => {
  await page.goto("/#playlists")
  await page.getByRole("button", { name: "New playlist", exact: true }).click()
  await page.getByLabel("Name", { exact: true }).fill("After hours")
  await page.getByRole("button", { name: "Save playlist" }).click()
  await expect(page.getByRole("heading", { name: "After hours" })).toBeVisible()
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Themes & appearance" })
    .click()
  await page
    .getByRole("button", { name: "Apply Analog Soul", exact: true })
    .click()
  await expect
    .poll(() =>
      page
        .locator(".app")
        .evaluate((e) => getComputedStyle(e).getPropertyValue("--bg")),
    )
    .toBe("#f3ede3")
  await page.reload()
  await expect
    .poll(() =>
      page
        .locator(".app")
        .evaluate((e) => getComputedStyle(e).getPropertyValue("--bg")),
    )
    .toBe("#f3ede3")
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Playlists", exact: true })
    .click()
  await expect(page.getByRole("heading", { name: "After hours" })).toBeVisible()
})
test("responsive layouts have no horizontal overflow", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Your listening room" }),
  ).toBeVisible()
  for (const width of [320, 390, 768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `width ${width}`,
    ).toBe(true)
  }
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.screenshot({ path: "/tmp/aura-desktop.png", fullPage: true })
  await page.setViewportSize({ width: 390, height: 900 })
  await page.screenshot({ path: "/tmp/aura-mobile.png", fullPage: true })
})
test("live analysis, seeking, repeat and theme changes preserve one audio element", async ({
  page,
}) => {
  await page.goto("/")
  await page
    .getByRole("button", { name: "Import your music", exact: true })
    .click()
  await page.locator("#audio-import").setInputFiles({
    name: "Long signal.wav",
    mimeType: "audio/wav",
    buffer: wav(60),
  })
  await expect(page.getByText("1 saved.", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: "Close dialog" }).click()
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Your library" })
    .click()
  await page
    .getByRole("button", { name: "Play Long signal", exact: true })
    .click()
  await expect(
    page
      .locator(".mini-controls")
      .getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Expand player", exact: true }).click()
  await chooseOption(
    page.getByRole("combobox", { name: "Player display" }),
    "Atmosphere",
  )
  await expect
    .poll(async () =>
      page
        .getByLabel("Live audio frequency visualization")
        .evaluate((element: HTMLCanvasElement) => {
          const pixels = element
            .getContext("2d")!
            .getImageData(0, 0, element.width, element.height).data
          let painted = 0
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) painted++
          return painted / (element.width * element.height)
        }),
    )
    .toBeGreaterThan(0.02)
  await page.getByRole("button", { name: "Close dialog" }).click()
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Themes & appearance" })
    .click()
  await page
    .getByRole("button", { name: "Apply Neon Bloom", exact: true })
    .click()
  await expect(
    page
      .locator(".mini-controls")
      .getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible()
  const seek = page.locator(".mini-controls input[type=range]")
  const bounds = await seek.boundingBox()
  await seek.click({
    position: { x: bounds!.width * 0.75, y: bounds!.height / 2 },
  })
  await expect
    .poll(async () =>
      Number(
        await page.locator(".mini-controls input[type=range]").inputValue(),
      ),
    )
    .toBeGreaterThan(44)
  await page
    .locator(".mini-controls")
    .getByRole("button", { name: "Pause", exact: true })
    .click()
  await page.getByRole("button", { name: "Expand player", exact: true }).click()
  await chooseOption(
    page.getByRole("combobox", { name: "Player display" }),
    "Atmosphere",
  )
  await expect(
    page.getByLabel("Live audio frequency visualization"),
  ).toBeVisible()
  await page.getByRole("button", { name: "Close dialog" }).click()
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Your library" })
    .click()
  await page.getByRole("button", { name: "Options for Long signal" }).click()
  await expect(page.getByText(/0 qualified plays/)).toBeVisible()
})
test("duplicate import, unavailable audio and relink preserve track identity", async ({
  page,
}) => {
  await page.goto("/")
  await page
    .getByRole("button", { name: "Import your music", exact: true })
    .click()
  const file = { name: "Recover.wav", mimeType: "audio/wav", buffer: wav() }
  await page.locator("#audio-import").setInputFiles(file)
  await expect(page.getByText("1 saved.", { exact: false })).toBeVisible()
  await page.locator("#audio-import").setInputFiles(file)
  await expect(
    page.getByText("Recover.wav: duplicate skipped", { exact: true }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Close dialog" }).click()
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "Your library" })
    .click()
  await page
    .getByRole("button", { name: "Favorite Recover", exact: true })
    .click()
  const originalId = await page.evaluate(async () => {
    const path = "/src/storage.ts",
      { database } = await import(path)
    const db = await database()
    const t = (await db.getAll("tracks"))[0]
    await db.delete("sources", t.id)
    return t.id
  })
  await page.getByRole("button", { name: "Play Recover", exact: true }).click()
  await expect(page.getByText("Relink required", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Options for Recover" }).click()
  await page
    .getByRole("button", { name: "Relink audio file", exact: true })
    .click()
  page.once("dialog", (d) => d.accept())
  await page.locator("#audio-import").setInputFiles(file)
  await expect(page.getByText("1 saved.", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: "Close dialog" }).click()
  await expect(
    page.getByRole("button", { name: "Favorite Recover", exact: true }),
  ).toHaveClass(/active/)
  expect(
    await page.evaluate(async () => {
      const path = "/src/storage.ts",
        { database } = await import(path)
      return (await (await database()).getAll("tracks"))[0].id
    }),
  ).toBe(originalId)
  await page.getByRole("button", { name: "Play Recover", exact: true }).click()
  await expect(
    page
      .locator(".mini-controls")
      .getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible()
})
test("theme preview cancels and focus remains in the dialog", async ({
  page,
}) => {
  await page.goto("/#themes")
  await page
    .getByRole("button", { name: "Create your own", exact: true })
    .click()
  await page.getByLabel("Theme name", { exact: true }).fill("Custom world")
  await chooseOption(
    page.getByRole("combobox", { name: "Base preset", exact: true }),
    "analog",
  )
  await expect
    .poll(() =>
      page
        .locator(".app")
        .evaluate((e) => getComputedStyle(e).getPropertyValue("--bg")),
    )
    .toBe("#f3ede3")
  for (let i = 0; i < 15; i++) await page.keyboard.press("Tab")
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBe(true)
  await page
    .getByRole("button", { name: "Cancel preview", exact: true })
    .click()
  await expect
    .poll(() =>
      page
        .locator(".app")
        .evaluate((e) => getComputedStyle(e).getPropertyValue("--bg")),
    )
    .toBe("#0b1220")
})
