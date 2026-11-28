import { expect, test } from "@playwright/test";

// Saving the schedule changes the seeded tournament for the rest of the run.
test.describe.configure({ retries: 0 });

test("organizer saves a court assignment that a public visitor can see", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(process.env.E2E_SCHEDULE !== "1", "Requires the seeded tournament API");

  const email = "playwright-organizer@example.org";
  const idToken = `test:${email}`;
  const account = {
    localId: "playwright-organizer",
    email,
    displayName: "Playwright Organizer",
    emailVerified: true,
    providerUserInfo: [{ providerId: "password", email }],
  };

  // Substitute only Firebase's identity service. Tournament requests use FastAPI and PostgreSQL.
  await page.route("https://identitytoolkit.googleapis.com/v1/accounts:*", async (route) => {
    const method = new URL(route.request().url()).pathname;
    if (method.endsWith(":signInWithPassword")) {
      await route.fulfill({ json: { ...account, idToken, refreshToken: "fixture", expiresIn: "3600" } });
    } else if (method.endsWith(":lookup")) {
      await route.fulfill({ json: { users: [account] } });
    } else {
      await route.abort();
    }
  });

  const guest = await browser.newContext({ baseURL });
  try {
    const publicPage = await guest.newPage();
    await publicPage.goto("/t/playwright-scorekeeping/schedule");
    await expect(publicPage.getByText("No schedule has been published yet.")).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email Address").fill(email);
    await page.getByPlaceholder("Your password", { exact: true }).fill("playwright-password");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/\/tournaments$/);
    await expect(page.getByText("Playwright Tournament", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: /^open$/i }).click();
    await page.locator('a[href$="/schedule"]:visible').click();

    const assign = page.getByRole("button", { name: "Auto-assign courts", exact: true });
    await expect(assign).toBeEnabled();
    page.once("dialog", (dialog) => dialog.accept());
    await assign.click();
    await expect(page.getByText("Unsaved time block changes")).toBeVisible();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Schedule saved", { exact: true })).toBeVisible();

    await publicPage.reload();
    await expect(publicPage.getByText("Court 1", { exact: true })).toBeVisible();
    await expect(publicPage.getByText("Playwright Individuals – Group 1", { exact: true })).toBeVisible();
  } finally {
    await guest.close();
  }
});
