import { expect, test } from "@playwright/test"

test("smart playlist uses saved metadata, persists feedback, and saves exact draft", async ({
  page,
}) => {
  await page.goto("/#discover")
  await page.evaluate(async () => {
    const { database } = await import("/src/storage.ts")
    await (await database()).put("tracks", {
      id: "focus-track",
      title: "Quiet Signal",
      artist: "Local Artist",
      album: "Study Room",
      filename: "quiet.wav",
      duration: 120,
      size: 100,
      fingerprint: "focus-fingerprint",
      added: Date.now(),
      favorite: false,
      plays: 0,
      moodTags: ["Focus"],
      genres: ["Ambient"],
    })
  })
  await page.reload()
  await page.getByRole("button", { name: /Study & Deep Focus/ }).click()
  await expect(page.getByText("Quiet Signal", { exact: true })).toBeVisible()
  await expect(page.getByText(/Matching mood\/activity tag/)).toBeVisible()
  await page.getByRole("button", { name: "More like Quiet Signal" }).click()
  await expect(
    page.getByRole("button", { name: "More like Quiet Signal" }),
  ).toHaveAttribute("aria-pressed", "true")
  await page.reload()
  await page.getByRole("button", { name: /Study & Deep Focus/ }).click()
  await expect(
    page.getByRole("button", { name: "More like Quiet Signal" }),
  ).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "Save playlist" }).click()
  await page.getByLabel("Playlist name").fill("Deep work")
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save playlist" })
    .click()
  await expect(page.getByRole("heading", { name: "Deep work" })).toBeVisible()
  expect(
    await page.evaluate(async () => {
      const { database } = await import("/src/storage.ts")
      return (await (await database()).getAll("playlists"))[0].tracks
    }),
  ).toEqual(["focus-track"])
})

test("offline connectivity state does not disable local smart playlists", async ({
  page,
  context,
}) => {
  await page.goto("/#discover")
  await context.setOffline(true)
  await expect(page.getByLabel("Connection: offline")).toContainText("Offline")
  await expect(
    page.getByRole("button", { name: /Happy & Energized/ }),
  ).toBeEnabled()
  await context.setOffline(false)
  await expect(page.getByLabel("Connection: reconnecting")).toBeVisible()
  await expect(page.getByLabel("Connection: online")).toBeVisible({
    timeout: 4000,
  })
})
