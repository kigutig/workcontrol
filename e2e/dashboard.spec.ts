import { test, expect } from "@playwright/test";

/**
 * Dashboard E2E Smoke Tests
 *
 * Tests basic dashboard loading and navigation.
 * Most tests require authentication.
 *
 * Tags: @smoke @dashboard
 */

test.describe("Dashboard (Public/Redirect)", () => {
  test("@smoke redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    // Should be redirected to auth
    await expect(page).toHaveURL(/auth|login/i, { timeout: 10000 });
  });

  test("@smoke main route loads without JS errors", async ({ page }) => {
    const jsErrors: string[] = [];
    page.on("pageerror", (err) => {
      jsErrors.push(err.message);
    });

    await page.goto("/");
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors
    const criticalErrors = jsErrors.filter(
      (e) =>
        !e.includes("ResizeObserver") && !e.includes("Non-Error") && !e.includes("ChunkLoadError"),
    );

    expect(criticalErrors.length).toBe(0);
  });

  test("@smoke auth page is accessible", async ({ page }) => {
    await page.goto("/auth");
    await expect(
      page.locator("form, input[type='email'], button[type='submit']").first(),
    ).toBeVisible();
  });
});

test.describe("Dashboard (Authenticated)", () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    "E2E_TEST_EMAIL not set, skipping authenticated dashboard tests",
  );

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/auth");
    await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL as string);
    await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD as string);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/dashboard|\//i, { timeout: 15000 });
  });

  test("@smoke dashboard loads with main content", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("main, [role='main']").first()).toBeVisible({ timeout: 10000 });
  });

  test("@smoke navigation links are present", async ({ page }) => {
    await page.goto("/dashboard");
    // Check for navigation elements
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible({ timeout: 5000 });
  });

  test("can navigate to tasks page", async ({ page }) => {
    await page.goto("/dashboard");
    // Look for a tasks link in navigation
    const tasksLink = page.locator('a[href*="tasks"]').first();
    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await expect(page).toHaveURL(/tasks/i, { timeout: 10000 });
    }
  });
});
