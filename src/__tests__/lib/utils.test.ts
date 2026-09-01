/**
 * Unit tests for src/lib/utils.ts — the cn() classname utility
 */

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (classname utility)", () => {
  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });

  it("combines multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes (truthy)", () => {
    expect(cn("base", true && "active")).toBe("base active");
  });

  it("handles conditional classes (falsy)", () => {
    expect(cn("base", false && "hidden")).toBe("base");
    expect(cn("base", undefined)).toBe("base");
    expect(cn("base", null)).toBe("base");
  });

  it("merges tailwind classes correctly (tailwind-merge)", () => {
    // tailwind-merge deduplicates conflicting classes
    expect(cn("p-4", "p-6")).toBe("p-6");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles object syntax", () => {
    expect(cn({ active: true, hidden: false })).toBe("active");
  });

  it("handles array syntax", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles complex combinations", () => {
    const result = cn(
      "base-class",
      { "is-active": true, "is-disabled": false },
      ["extra-a", "extra-b"],
    );
    expect(result).toContain("base-class");
    expect(result).toContain("is-active");
    expect(result).toContain("extra-a");
    expect(result).not.toContain("is-disabled");
  });
});
