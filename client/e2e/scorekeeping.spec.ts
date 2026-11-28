import { expect, test } from "@playwright/test";

// Each seeded bracket starts empty and is changed by this test.
test.describe.configure({ retries: 0 });

test("scorekeeper saves a score that a public visitor can see", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(process.env.E2E_SCOREKEEPING !== "1", "Requires the seeded scorekeeping API");

  const guest = await browser.newContext({ baseURL });
  try {
    const publicPage = await guest.newPage();
    await publicPage.goto("/t/playwright-scorekeeping/scores");
    await publicPage.getByText("Playwright Individuals", { exact: true }).click();
    await publicPage.getByText("Group 1", { exact: true }).click();
    await expect(
      publicPage.getByRole("heading", { name: "Playwright Individuals - Group 1" }),
    ).toBeVisible();
    await expect(publicPage.getByText("Not started", { exact: true })).toBeVisible();

    await page.goto("/scorekeeping");
    await page.getByLabel("Access code").fill("playwright-scorekeeper");
    await page.getByLabel("First name").fill("Test");
    await page.getByLabel("Last name").fill("Scorekeeper");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/tournaments\/\d+\/scores$/);
    await page.getByText("Playwright Individuals", { exact: true }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByPlaceholder("SCORE", { exact: true }).first().fill("K");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Scores saved.", { exact: true })).toBeVisible();

    await publicPage.reload();
    await expect(publicPage.getByText("Ⓚ", { exact: true })).toBeVisible();
  } finally {
    await guest.close();
  }
});
