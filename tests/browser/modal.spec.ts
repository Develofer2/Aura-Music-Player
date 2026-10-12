import { test, expect } from "@playwright/test"

test("regular and custom-class modals render without runtime errors", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Your listening room" }),
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Import your music", exact: true })
    .click()
  let dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveClass("modal-content")
  await dialog.getByRole("button", { name: "Close dialog" }).click()
  await expect(dialog).toHaveCount(0)

  await page.getByRole("button", { name: "Expand player", exact: true }).click()
  dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveClass("modal-content listening-modal")
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)

  await page.getByRole("button", { name: "Open queue", exact: true }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await page.reload()
  await expect(
    page.getByRole("heading", { name: "Your listening room" }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
