import { expect, test } from "@playwright/test";

/**
 * Smoke flows. Start the app first (frontend on :3000).
 * Optional: E2E_PUBLIC_SLUG=<dashboard_endpoint> to hit a real public tournament.
 */
test.describe("KenManage smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("heading", { name: /KenManage/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator('input[type="email"], input[type="password"]').first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("public tournament page loads when slug configured", async ({
    page,
  }) => {
    const slug = process.env.E2E_PUBLIC_SLUG;
    test.skip(!slug, "Set E2E_PUBLIC_SLUG to exercise public dashboard");
    await page.goto(`/t/${slug}`);
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/login/i);
  });
});
