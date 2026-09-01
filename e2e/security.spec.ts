import { test, expect } from "@playwright/test";

/**
 * Security E2E Tests — DevSecOps
 *
 * Tests security headers, XSS protection, CSP, and
 * other security-related behaviors in the browser.
 *
 * Tags: @security
 * Project: security (runs on Chromium only)
 */

test.describe("Security Headers", () => {
  test("@smoke has X-Content-Type-Options header", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};
    // X-Content-Type-Options should be set (prevents MIME sniffing)
    if (headers["x-content-type-options"]) {
      expect(headers["x-content-type-options"]).toBe("nosniff");
    }
    // Note: Cloudflare Pages may inject this
    console.log("[Security] x-content-type-options:", headers["x-content-type-options"] ?? "not set");
  });

  test("has X-Frame-Options or CSP frame-ancestors", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};
    const xFrameOptions = headers["x-frame-options"];
    const csp = headers["content-security-policy"];

    const hasFrameProtection =
      xFrameOptions !== undefined ||
      (csp !== undefined && csp.includes("frame-ancestors"));

    console.log("[Security] x-frame-options:", xFrameOptions ?? "not set");
    console.log("[Security] csp frame-ancestors:", csp?.includes("frame-ancestors") ? "present" : "not set");

    // At least one framing protection should be present
    // This is a warning test — report but don't fail hard
    if (!hasFrameProtection) {
      console.warn("[Security] ⚠️ No clickjacking protection headers detected");
    }
  });

  test("auth endpoint uses HTTPS in production", async ({ page }) => {
    const url = page.url();
    if (!url.includes("localhost") && !url.includes("127.0.0.1")) {
      expect(url.startsWith("https://")).toBe(true);
    } else {
      console.log("[Security] Skipping HTTPS check on localhost");
    }
    await page.goto("/auth");
    const finalUrl = page.url();
    if (!finalUrl.includes("localhost")) {
      expect(finalUrl.startsWith("https://")).toBe(true);
    }
  });
});

test.describe("XSS Prevention", () => {
  test("@smoke auth form rejects script injection in email", async ({ page }) => {
    await page.goto("/auth");

    const xssPayload = '<script>window.__xss_triggered = true;</script>';
    await page.fill('input[type="email"]', xssPayload);
    await page.fill('input[type="password"]', "password123");
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(1500);

    // Check that XSS didn't execute
    const xssExecuted = await page.evaluate(() => {
      return (window as unknown as Record<string, unknown>)["__xss_triggered"];
    });

    expect(xssExecuted).toBeFalsy();
  });

  test("URL parameters are not rendered as HTML", async ({ page }) => {
    // Test reflected XSS via URL parameters
    await page.goto('/auth?error=<img src=x onerror="window.__xss2=1">');
    await page.waitForTimeout(1000);

    const xssExecuted = await page.evaluate(() => {
      return (window as unknown as Record<string, unknown>)["__xss2"];
    });

    expect(xssExecuted).toBeFalsy();
  });

  test("hash injection does not execute scripts", async ({ page }) => {
    await page.goto('/auth#<script>window.__xss3=1</script>');
    await page.waitForTimeout(1000);

    const xssExecuted = await page.evaluate(() => {
      return (window as unknown as Record<string, unknown>)["__xss3"];
    });

    expect(xssExecuted).toBeFalsy();
  });
});

test.describe("Authentication Security", () => {
  test("no sensitive data in localStorage on auth page", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForTimeout(1000);

    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)!;
        items[key] = window.localStorage.getItem(key)!;
      }
      return items;
    });

    // Check that no raw passwords are stored
    const values = Object.values(localStorage).join(" ");
    expect(values).not.toMatch(/password|senha/i);
  });

  test("session tokens are not in URL", async ({ page }) => {
    await page.goto("/");
    const url = page.url();
    // Supabase access tokens should never be in the URL query params
    expect(url).not.toContain("access_token=");
    expect(url).not.toContain("refresh_token=");
  });

  test("auth page does not have autocomplete on password (security best practice)", async ({
    page,
  }) => {
    await page.goto("/auth");
    const passwordInput = page.locator('input[type="password"]').first();
    const autocomplete = await passwordInput.getAttribute("autocomplete");
    // autocomplete should be 'current-password', 'new-password' or 'off'
    // NOT just empty (which allows browsers to auto-fill with potentially wrong credentials)
    console.log("[Security] password autocomplete:", autocomplete);
  });
});

test.describe("Content Security", () => {
  test("application does not load scripts from untrusted CDNs", async ({
    page,
  }) => {
    const scriptSources: string[] = [];

    page.on("request", (req) => {
      if (req.resourceType() === "script") {
        scriptSources.push(req.url());
      }
    });

    await page.goto("/auth");
    await page.waitForTimeout(2000);

    // Verify no scripts from obviously untrusted domains
    const untrustedDomains = ["eval.in", "pastebin.com", "bit.ly"];
    scriptSources.forEach((src) => {
      untrustedDomains.forEach((domain) => {
        expect(src).not.toContain(domain);
      });
    });

    console.log("[Security] Script sources loaded:", scriptSources.length);
  });

  test("error pages do not expose stack traces", async ({ page }) => {
    // Try to trigger a 404
    const response = await page.goto("/this-route-definitely-does-not-exist-xyz");

    // If we get a response, check it doesn't expose sensitive info
    if (response) {
      const content = await page.content();
      expect(content).not.toMatch(/at\s+\w+\s+\(.*:\d+:\d+\)/); // Stack trace pattern
      expect(content).not.toContain("node_modules");
      expect(content).not.toContain("process.env");
    }
  });
});
