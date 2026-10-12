import { test, expect } from "@playwright/test"
import { chooseOption } from "./helpers"
test("new glass theme and all player modes are responsive and saved", async ({
  page,
}) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Your listening room" }),
  ).toBeVisible()
  await expect(page.locator(".app")).toHaveAttribute("data-material", "glass")
  await expect(
    page.locator(".mode-tabs").getByRole("button", { name: "Holo CD" }),
  ).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Expand player" }).click()
  const dialog = page.getByRole("dialog")
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 960 })
    for (const mode of ["CD", "Vinyl", "Artwork", "Progress", "Atmosphere"]) {
      await chooseOption(
        dialog.getByRole("combobox", { name: "Player display" }),
        mode,
      )
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
        `${width}px ${mode} dialog overflow`,
      ).toBe(true)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}px document overflow`,
      ).toBe(true)
    }
  }
  await chooseOption(
    dialog.getByRole("combobox", { name: "Player display" }),
    "CD",
  )
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.screenshot({ path: "/tmp/aura-new-player.png" })
  await dialog.getByRole("button", { name: "Close dialog" }).click()
  await chooseOption(
    page.getByRole("combobox", { name: "App theme" }),
    "chrome",
  )
  await expect(page.locator(".app")).toHaveAttribute("data-material", "chrome")
  await page.reload()
  await expect(page.locator(".app")).toHaveAttribute("data-material", "chrome")
  await chooseOption(page.getByRole("combobox", { name: "App theme" }), "glass")
  await page.waitForTimeout(400)
  await page.screenshot({ path: "/tmp/aura-glass-desktop.png" })
  await page.setViewportSize({ width: 390, height: 900 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: "/tmp/aura-glass-mobile.png" })
  await page.locator(".collection-grid").scrollIntoViewIfNeeded()
  await expect(page.getByText("Bring your favorites along.")).toBeVisible()
  await page.screenshot({ path: "/tmp/aura-glass-mobile-library.png" })
  expect(errors).toEqual([])
})
test("all nine themes render across every main screen without overflow", async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Your listening room" }),
  ).toBeVisible()
  for (const theme of [
    "midnight",
    "glass",
    "neon",
    "solar",
    "holo",
    "aurora",
    "analog",
    "chrome",
    "velvet",
  ]) {
    await chooseOption(page.getByRole("combobox", { name: "App theme" }), theme)
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      for (const route of [
        "home",
        "library",
        "playlists",
        "stats",
        "themes",
        "settings",
      ]) {
        await page.goto(`/#${route}`)
        await expect(page.locator(".page")).toBeVisible()
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${theme} ${route} at ${width}px`,
        ).toBe(true)
      }
    }
  }
})
test("reduced motion stops decorative animation and paused discs stay paused", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Your listening room" }),
  ).toBeVisible()
  expect(
    await page
      .locator(".glass-orb")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none")
  expect(
    await page
      .locator(".record")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none")
  await page.emulateMedia({ reducedMotion: "no-preference" })
  expect(
    await page
      .locator(".record")
      .evaluate((element) => getComputedStyle(element).animationPlayState),
  ).toBe("paused")
})
test("long track and playlist names stay aligned on populated screens", async ({
  page,
}) => {
  const b = Buffer.alloc(44 + 16000)
  b.write("RIFF")
  b.writeUInt32LE(b.length - 8, 4)
  b.write("WAVE", 8)
  b.write("fmt ", 12)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(8000, 24)
  b.writeUInt32LE(16000, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write("data", 36)
  b.writeUInt32LE(16000, 40)
  await page.goto("/")
  await page
    .getByRole("button", { name: "Import your music", exact: true })
    .click()
  await page.locator("#audio-import").setInputFiles({
    name: "A very long track title that should never push the player or library out of alignment.wav",
    mimeType: "audio/wav",
    buffer: b,
  })
  await expect(page.getByText("1 saved.", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: "Close dialog" }).click()
  await page.goto("/#playlists")
  await page.getByRole("button", { name: "New playlist", exact: true }).click()
  await page
    .getByLabel("Name", { exact: true })
    .fill("A long playlist name for those very long late night drives home")
  await page.getByRole("button", { name: "Save playlist" }).click()
  await page.getByRole("button", { name: "Add tracks", exact: true }).click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add", exact: true })
    .click()
  await page.getByRole("button", { name: "Close dialog" }).click()
  const playlistRoute = await page.evaluate(() => location.hash)
  for (const route of [playlistRoute, "#library", "#home"]) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto(`/${route}`)
      await expect(page.locator(".page")).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} ${width}px`,
      ).toBe(true)
    }
  }
})
