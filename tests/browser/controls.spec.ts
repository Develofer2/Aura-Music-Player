import { test, expect } from "@playwright/test"
import { chooseOption } from "./helpers"

test("controls reflow without icon collisions across narrow and wide screens", async ({
  page,
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const width of [
    280, 320, 360, 390, 430, 520, 650, 768, 850, 1024, 1440, 1920, 2560,
  ]) {
    await page.setViewportSize({ width, height: 900 })
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
        `${route} at ${width}px`,
      ).toBe(true)
      const collisions = await page.locator(".select-trigger").evaluateAll(
        (elements) =>
          elements.filter((element) => {
            const button = element.getBoundingClientRect()
            if (!button.width || !button.height) return false
            const text = element.firstElementChild!.getBoundingClientRect()
            const icon = element
              .querySelector(".select-chevron")!
              .getBoundingClientRect()
            if (!icon.width) return false
            return (
              text.right > icon.left + 1 ||
              icon.right > button.right + 1 ||
              icon.left < button.left
            )
          }).length,
      )
      expect(
        collisions,
        `${route} at ${width}px: select label/chevron overlap`,
      ).toBe(0)
    }
  }
  expect(errors).toEqual([])
})

test("theme-aware menus have no pointer focus ring and retain keyboard focus", async ({
  page,
}) => {
  await page.goto("/#library")
  await chooseOption(
    page.getByRole("combobox", { name: "App theme" }),
    "analog",
  )
  const filter = page.getByRole("combobox", { name: "Filter tracks" })
  await filter.click()
  const menu = page.getByRole("listbox")
  await expect(menu).toBeVisible()
  expect(
    await menu.evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("1")
  expect(
    await menu.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(232, 223, 210)")
  await page.getByRole("option", { name: "Favorites", exact: true }).click()
  await expect(filter).toHaveText("Favorites")
  expect(
    await filter.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("none")

  await page.keyboard.press("Tab")
  const sort = page.getByRole("combobox", {
    name: "Sort tracks",
    includeHidden: true,
  })
  await expect(sort).toBeFocused()
  expect(
    await sort.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("listbox")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(sort).toBeFocused()
  await sort.click()
  expect(
    await sort.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("none")
  await page.keyboard.press("Escape")

  const backgrounds = await page
    .locator(".top-search .field, .search-field .field")
    .evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).backgroundColor),
    )
  expect(backgrounds.every((color) => color === "rgba(0, 0, 0, 0)")).toBe(true)
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollbarWidth,
    ),
  ).toBe("thin")
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollbarColor,
    ),
  ).not.toBe("auto")
})

test("small-screen menus remain inside the viewport and filters stay readable", async ({
  page,
}) => {
  await page.goto("/#library")
  await chooseOption(
    page.getByRole("combobox", { name: "App theme" }),
    "analog",
  )
  for (const [width, height] of [
    [280, 700],
    [320, 360],
    [390, 500],
    [520, 360],
    [768, 480],
  ]) {
    await page.setViewportSize({ width, height })
    const filter = page.getByRole("combobox", { name: "Filter tracks" })
    await filter.click()
    const menu = page.getByRole("listbox")
    await expect(menu).toBeVisible()
    const bounds = await menu.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height)
    await page
      .getByRole("option", { name: "Recently added", exact: true })
      .click()
    expect(
      await filter.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeGreaterThanOrEqual(12)
    expect(
      await filter.evaluate((element) => {
        const text = element.firstElementChild as HTMLElement
        return text.scrollWidth <= text.clientWidth + 1
      }),
    ).toBe(true)
  }
  await page.setViewportSize({ width: 320, height: 800 })
  await page.screenshot({ path: "/tmp/aura-controls-mobile.png" })
  await page.getByRole("combobox", { name: "Filter tracks" }).click()
  await page.screenshot({ path: "/tmp/aura-controls-mobile-menu.png" })
})

test("dropdown animation respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/#library")
  await page.getByRole("combobox", { name: "Filter tracks" }).click()
  expect(
    await page
      .getByRole("listbox")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none")
})
