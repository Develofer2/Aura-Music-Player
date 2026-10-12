import { test, expect, type Locator } from "@playwright/test"
import { chooseOption } from "./helpers"

async function isReachable(control: Locator) {
  return control.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const target = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    )
    return !!target && element.contains(target)
  })
}

test("mobile header stays reachable and theme picker is a circular icon", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const width of [280, 320, 390, 430, 650]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto("/")
    await expect(
      page.getByRole("heading", { name: "Your listening room" }),
    ).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const header = page.locator(".topbar")
    expect((await header.boundingBox())!.y).toBe(0)
    const theme = page.getByRole("combobox", { name: "App theme" })
    const bounds = await theme.boundingBox()
    expect(bounds!.width).toBe(44)
    expect(bounds!.height).toBe(44)
    expect(
      await theme.evaluate((element) => getComputedStyle(element).borderRadius),
    ).toBe("50%")
    expect(await isReachable(theme)).toBe(true)
    expect(
      await isReachable(page.getByRole("button", { name: "Open navigation" })),
    ).toBe(true)
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollbarWidth,
      ),
    ).toBe("none")
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await chooseOption(theme, "velvet")
    await expect(page.locator(".app")).toHaveAttribute(
      "data-material",
      "velvet",
    )
  }
  expect(errors).toEqual([])
})

test("mobile navigation never covers the header and dismisses cleanly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  const trigger = page.getByRole("button", { name: "Open navigation" })
  await trigger.click()
  const panel = page.getByRole("dialog", { name: "Your space" })
  await expect(panel).toBeVisible()
  const header = await page.locator(".topbar").boundingBox()
  expect((await panel.boundingBox())!.y).toBeGreaterThan(
    header!.y + header!.height,
  )
  expect(
    await isReachable(page.getByRole("combobox", { name: "App theme" })),
  ).toBe(true)
  expect(
    await isReachable(panel.getByRole("button", { name: "Close dialog" })),
  ).toBe(true)
  await page.screenshot({ path: "/tmp/aura-mobile-navigation.png" })

  await chooseOption(
    page.getByRole("combobox", { name: "App theme" }),
    "analog",
  )
  await expect(panel).toHaveCount(0)
  await expect(page.locator(".app")).toHaveAttribute("data-material", "analog")
  await trigger.click()
  await expect(panel).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(panel).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await panel.getByRole("button", { name: "Close dialog" }).click()
  await expect(panel).toHaveCount(0)
  await trigger.click()
  await expect(panel).toBeVisible()
  await page
    .getByRole("button", { name: "Close navigation", exact: true })
    .click()
  await expect(panel).toHaveCount(0)
  await page.screenshot({ path: "/tmp/aura-mobile-header.png" })
})

test("short screens retain access to navigation links and pinned import action", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const [width, height] of [
    [280, 360],
    [320, 480],
    [650, 360],
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto("/")
    await page.getByRole("button", { name: "Open navigation" }).click()
    const panel = page.getByRole("dialog", { name: "Your space" })
    await expect(panel).toBeVisible()
    const importButton = panel.getByRole("button", {
      name: "Import music",
      exact: true,
    })
    expect(await isReachable(importButton)).toBe(true)
    const settings = panel.getByRole("button", {
      name: "Settings",
      exact: true,
    })
    await settings.scrollIntoViewIfNeeded()
    expect(await isReachable(settings)).toBe(true)
    await settings.click()
    await expect(panel).toHaveCount(0)
    await expect(
      page.getByRole("heading", { name: /Your space. Your control/ }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Open navigation" }).click()
    await expect(panel).toBeVisible()
    await importButton.click()
    await expect(page.getByRole("dialog")).toHaveCount(1)
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Choose files" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Close dialog" }).click()
    await page.getByRole("button", { name: "Open navigation" }).click()
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(panel).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
