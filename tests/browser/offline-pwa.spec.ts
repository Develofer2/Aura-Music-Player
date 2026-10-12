import { expect, test } from "@playwright/test"

test.skip(
  process.env.AURA_PWA_TEST !== "1",
  "Run against the built dist with AURA_PWA_TEST=1.",
)

function wav(seconds = 8) {
  const rate = 8000
  const count = rate * seconds
  const buffer = Buffer.alloc(44 + count * 2)
  buffer.write("RIFF")
  buffer.writeUInt32LE(buffer.length - 8, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(rate, 24)
  buffer.writeUInt32LE(rate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(count * 2, 40)
  for (let index = 0; index < count; index++)
    buffer.writeInt16LE(
      Math.round(Math.sin((index / rate) * Math.PI * 2 * 220) * 4000),
      44 + index * 2,
    )
  return buffer
}

test("production shell and copied audio reopen and play offline", async ({
  page,
  context,
}) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Got it" }).click()
  await page
    .getByRole("button", { name: "Import your music", exact: true })
    .click()
  await page.locator("#audio-import").setInputFiles({
    name: "Offline signal.wav",
    mimeType: "audio/wav",
    buffer: wav(),
  })
  await expect(page.getByText("1 saved.", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: "Close dialog" }).click()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true)
  await expect(
    page.getByRole("heading", { name: "Your listening room" }),
  ).toBeVisible()
  const cacheAudit = await page.evaluate(async () => {
    const names = await caches.keys()
    const urls = (
      await Promise.all(
        names.map(async (name) =>
          (await caches.open(name))
            .keys()
            .then((keys) => keys.map((key) => key.url)),
        ),
      )
    ).flat()
    const source = await new Promise<{ blob?: Blob } | undefined>(
      (resolve, reject) => {
        const open = indexedDB.open("aura")
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const request = open.result
            .transaction("sources")
            .objectStore("sources")
            .getAll()
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve(request.result[0])
        }
      },
    )
    return {
      cacheCount: names.length,
      cachedAudio: urls.some((url) => /\.(wav|mp3|flac)(?:$|\?)/i.test(url)),
      blobSize: source?.blob?.size || 0,
    }
  })
  expect(cacheAudit.cacheCount).toBeGreaterThan(0)
  expect(cacheAudit.cachedAudio).toBe(false)
  expect(cacheAudit.blobSize).toBeGreaterThan(0)
  await context.setOffline(true)
  await page.close()
  const offlinePage = await context.newPage()
  await offlinePage.goto("/#library")
  await expect(
    offlinePage.getByRole("heading", { name: "Your library" }),
  ).toBeVisible()
  await expect(offlinePage.getByLabel("Connection: offline")).toBeVisible()
  await offlinePage
    .getByRole("button", { name: "Play Offline signal", exact: true })
    .click()
  await expect(
    offlinePage
      .locator(".mini-controls")
      .getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible()
})
