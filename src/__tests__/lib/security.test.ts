/**
 * Unit tests for src/lib/security.ts
 *
 * Tests all security utilities: sanitization, validation,
 * rate limiting, and password strength evaluation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sanitizeText,
  truncate,
  sanitizeAndTruncate,
  isValidEmail,
  isValidUUID,
  isSafeUrl,
  validateFileUpload,
  containsSuspiciousContent,
  isRateLimited,
  clearRateLimit,
  getPasswordStrength,
  MAX_LENGTH,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/security";

// ─── sanitizeText ───────────────────────────────────────────────
describe("sanitizeText", () => {
  it("returns empty string for non-string input", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText(42)).toBe("");
    expect(sanitizeText({})).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("removes HTML tags", () => {
    expect(sanitizeText("<script>alert(1)</script>hello")).toBe("hello");
    expect(sanitizeText("<b>bold</b>")).toBe("bold");
    expect(sanitizeText("<img src=x onerror=alert(1)>")).toBe("");
  });

  it("handles normal text without modification", () => {
    expect(sanitizeText("Hello World 123!")).toBe("Hello World 123!");
  });

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("removes nested tags", () => {
    expect(sanitizeText("<div><p>text</p></div>")).toBe("text");
  });
});

// ─── truncate ───────────────────────────────────────────────────
describe("truncate", () => {
  it("does not truncate strings within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates strings exceeding limit", () => {
    expect(truncate("hello world", 5)).toBe("hello");
  });

  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

// ─── sanitizeAndTruncate ────────────────────────────────────────
describe("sanitizeAndTruncate", () => {
  it("sanitizes and truncates", () => {
    const input = "<b>Hello World This Is A Long String</b>";
    const result = sanitizeAndTruncate(input, 10);
    expect(result).toBe("Hello Worl");
    expect(result).not.toContain("<");
  });

  it("uses default max length", () => {
    const input = "a".repeat(600);
    const result = sanitizeAndTruncate(input);
    expect(result.length).toBe(MAX_LENGTH.text);
  });
});

// ─── isValidEmail ───────────────────────────────────────────────
describe("isValidEmail", () => {
  it("validates correct emails", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@domain.co.uk")).toBe(true);
    expect(isValidEmail("admin@fitcontrol.app")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(isValidEmail("notanemail")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("user @domain.com")).toBe(false);
  });

  it("rejects emails that are too long", () => {
    const longEmail = "a".repeat(250) + "@example.com";
    expect(isValidEmail(longEmail)).toBe(false);
  });
});

// ─── isValidUUID ────────────────────────────────────────────────
describe("isValidUUID", () => {
  it("validates correct UUIDs v4", () => {
    // These are valid UUID v4 (3rd group starts with 4, 4th with 8/9/a/b)
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);  // 4th group = a716 ✓
    expect(isValidUUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
    expect(isValidUUID("a8098c1a-f86e-4fbf-8a4c-e2f6f2a9b7c1")).toBe(true);
  });

  it("rejects non-v4 UUIDs", () => {
    // UUID v1 — 3rd segment starts with 1 (not 4)
    expect(isValidUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(false);
    // UUID v3 — 3rd segment starts with 3
    expect(isValidUUID("9073926b-929f-31c2-abc9-fad77ae3e8eb")).toBe(false);
  });

  it("rejects invalid UUIDs", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
    expect(isValidUUID("")).toBe(false);
    expect(isValidUUID("123e4567-e89b-12d3-a456-42661417400")).toBe(false); // too short
  });
});


// ─── isSafeUrl ──────────────────────────────────────────────────
describe("isSafeUrl", () => {
  it("allows http and https URLs", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com/path?q=1")).toBe(true);
  });

  it("blocks javascript: URLs", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("blocks data: URLs", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("blocks vbscript: URLs", () => {
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isSafeUrl("not-a-url")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
  });
});

// ─── validateFileUpload ─────────────────────────────────────────
describe("validateFileUpload", () => {
  const createFile = (name: string, type: string, size: number): File => {
    const file = new File(["x".repeat(size)], name, { type });
    return file;
  };

  it("accepts valid image files", () => {
    const file = createFile("photo.jpg", "image/jpeg", 1024);
    expect(validateFileUpload(file).valid).toBe(true);
  });

  it("rejects files with disallowed types", () => {
    const file = createFile("script.js", "application/javascript", 100);
    const result = validateFileUpload(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("rejects files exceeding size limit", () => {
    const file = createFile("huge.jpg", "image/jpeg", MAX_FILE_SIZE_BYTES + 1);
    const result = validateFileUpload(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("grande");
  });

  it("accepts all allowed image types", () => {
    ALLOWED_IMAGE_TYPES.forEach((type) => {
      const ext = type.split("/")[1];
      const file = createFile(`image.${ext}`, type, 1024);
      expect(validateFileUpload(file).valid).toBe(true);
    });
  });
});

// ─── containsSuspiciousContent ──────────────────────────────────
describe("containsSuspiciousContent", () => {
  it("detects script tags", () => {
    expect(containsSuspiciousContent("<script>alert(1)</script>")).toBe(true);
    expect(containsSuspiciousContent("<SCRIPT src='x'>")).toBe(true);
  });

  it("detects javascript: protocol", () => {
    expect(containsSuspiciousContent("javascript:void(0)")).toBe(true);
  });

  it("detects event handlers", () => {
    expect(containsSuspiciousContent('<img onerror="alert(1)">')).toBe(true);
    expect(containsSuspiciousContent("onclick=steal()")).toBe(true);
  });

  it("detects iframe injection", () => {
    expect(containsSuspiciousContent('<iframe src="evil.com">')).toBe(true);
  });

  it("passes clean text", () => {
    expect(containsSuspiciousContent("Tarefa de manutenção da máquina 001")).toBe(false);
    expect(containsSuspiciousContent("Observação: verificar rolamento")).toBe(false);
  });
});

// ─── isRateLimited ──────────────────────────────────────────────
describe("isRateLimited", () => {
  beforeEach(() => {
    clearRateLimit("test-action");
  });

  it("allows requests within limit", () => {
    expect(isRateLimited("test-action", 3, 60000)).toBe(false);
    expect(isRateLimited("test-action", 3, 60000)).toBe(false);
    expect(isRateLimited("test-action", 3, 60000)).toBe(false);
  });

  it("blocks requests exceeding limit", () => {
    isRateLimited("test-action", 3, 60000);
    isRateLimited("test-action", 3, 60000);
    isRateLimited("test-action", 3, 60000);
    expect(isRateLimited("test-action", 3, 60000)).toBe(true);
  });

  it("clears rate limit", () => {
    isRateLimited("test-action", 1, 60000);
    isRateLimited("test-action", 1, 60000); // should be blocked
    clearRateLimit("test-action");
    expect(isRateLimited("test-action", 1, 60000)).toBe(false);
  });
});

// ─── getPasswordStrength ────────────────────────────────────────
describe("getPasswordStrength", () => {
  it("rates very short password as score 0 or 1", () => {
    const result = getPasswordStrength("abc");
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("rates a strong password highly", () => {
    const result = getPasswordStrength("MyP@ssw0rd2024!");
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it("returns correct labels", () => {
    const weak = getPasswordStrength("abc");
    expect(["Muito fraca", "Fraca"]).toContain(weak.label);

    const strong = getPasswordStrength("C0mpl3xP@ssw0rd!");
    expect(["Boa", "Excelente"]).toContain(strong.label);
  });

  it("returns a color for each score", () => {
    const result = getPasswordStrength("test");
    expect(result.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("caps score at 4", () => {
    const result = getPasswordStrength("ExtremelyStr0ng!Password2024#$");
    expect(result.score).toBeLessThanOrEqual(4);
  });
});
