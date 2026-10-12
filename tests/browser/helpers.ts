import { expect, type Locator } from "@playwright/test"

export async function chooseOption(control: Locator, value: string) {
  await control.click()
  const option = control
    .page()
    .getByRole("option")
    .and(control.page().locator(`[data-value=${JSON.stringify(value)}]`))
  const label = (await option.innerText()).trim()
  await option.click()
  await expect(control).toHaveText(label)
  await expect(control).toHaveAttribute("data-state", "closed")
}
