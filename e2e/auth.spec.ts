import { test, expect } from "@playwright/test";

/**
 * Authentication E2E Tests
 * Tests login, logout, redirects, and auth page behavior.
 *
 * Tags: @smoke @auth
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL || "";

test.describe("Authentication Flow", () => {
  test.describe.configure({ mode: "serial" });

  // ─── Auth Page Loads ──────────────────────────────────────────
  test("@smoke loads auth page", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveTitle(/WorkControl|FitControl|Login/i);
    // Email and password fields must exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("@smoke redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to auth page
    await expect(page).toHaveURL(/auth|login/i);
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/auth");
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");

    // Find and click the submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for error feedback
    await page.waitForTimeout(2000);

    // Should show an error message (toast or form error)
    const hasError = await Promise.race([
      page
        .locator('[role="alert"]')
        .first()
        .isVisible()
        .catch(() => false),
      page
        .locator(".toast, [data-sonner-toast]")
        .first()
        .isVisible()
        .catch(() => false),
      page
        .locator("text=/erro|inválid|invalid|incorrect/i")
        .first()
        .isVisible()
        .catch(() => false),
    ]);

    expect(hasError).toBeTruthy();
  });

  test("does not expose credentials in URL", async ({ page }) => {
    await page.goto("/auth");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "supersecret");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1000);

    // URL should never contain credentials
    const url = page.url();
    expect(url).not.toContain("supersecret");
    expect(url).not.toContain("password");
  });

  test("password field is masked", async ({ page }) => {
    await page.goto("/auth");
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
    // The input type must be 'password' (masked)
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  // ─── Authenticated Flow (requires E2E_TEST_EMAIL + PASSWORD) ──
  test.describe("Authenticated", () => {
    test.skip(
      !process.env.E2E_TEST_EMAIL,
      "E2E_TEST_EMAIL not set, skipping authenticated tests",
    );

    test("@smoke logs in successfully", async ({ page }) => {
      await page.goto("/auth");
      await page.fill(
        'input[type="email"]',
        process.env.E2E_TEST_EMAIL as string,
      );
      await page.fill(
        'input[type="password"]',
        process.env.E2E_TEST_PASSWORD as string,
      );
      await page.locator('button[type="submit"]').first().click();

      // After login, should redirect to dashboard or home
      await page.waitForURL(/dashboard|home|\//i, { timeout: 15000 });
      expect(page.url()).not.toContain("/auth");
    });
  });
});
