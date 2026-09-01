/**
 * Unit tests for src/lib/task-utils.ts
 *
 * Tests all task utility functions: priority, type icons,
 * photo URL parsing, work hours calculation, and task timings.
 */

import { describe, it, expect } from "vitest";
import {
  priorityTone,
  typeIcon,
  parsePhotoUrls,
  formatPhotoUrls,
  getWorkHoursOverlap,
  calculateTaskTimings,
  checkNeedsAutoPause,
  TASK_TYPES,
  STATUS,
  PRIORITIES,
  type TaskInterval,
} from "@/lib/task-utils";

// ─── Constants ──────────────────────────────────────────────────
describe("Constants", () => {
  it("TASK_TYPES has expected values", () => {
    expect(TASK_TYPES).toContain("Montagem");
    expect(TASK_TYPES).toContain("Pintura");
    expect(TASK_TYPES).toContain("Manutenção");
    expect(TASK_TYPES.length).toBeGreaterThan(0);
  });

  it("STATUS has required fields", () => {
    STATUS.forEach((s) => {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("label");
      expect(s).toHaveProperty("tone");
    });
  });

  it("PRIORITIES contains expected values", () => {
    expect(PRIORITIES).toContain("Baixa");
    expect(PRIORITIES).toContain("Normal");
    expect(PRIORITIES).toContain("Alta");
    expect(PRIORITIES).toContain("Urgente");
  });
});

// ─── priorityTone ───────────────────────────────────────────────
describe("priorityTone", () => {
  it("returns destructive style for Urgente", () => {
    expect(priorityTone("Urgente")).toContain("destructive");
  });

  it("returns primary style for Alta", () => {
    expect(priorityTone("Alta")).toContain("primary");
  });

  it("returns muted style for Baixa", () => {
    expect(priorityTone("Baixa")).toContain("muted");
  });

  it("returns info style for Normal (default)", () => {
    expect(priorityTone("Normal")).toContain("info");
    expect(priorityTone("Unknown")).toContain("info");
  });
});

// ─── typeIcon ───────────────────────────────────────────────────
describe("typeIcon", () => {
  it("returns emoji for known types", () => {
    expect(typeIcon("Montagem")).toBe("🔧");
    expect(typeIcon("Pintura")).toBe("🎨");
    expect(typeIcon("Limpeza")).toBe("🧽");
    expect(typeIcon("Manutenção")).toBe("🛠️");
    expect(typeIcon("Embalagem")).toBe("📦");
    expect(typeIcon("Cadastro")).toBe("📝");
  });

  it("returns default icon for unknown types", () => {
    expect(typeIcon("Unknown")).toBe("⚙️");
    expect(typeIcon("")).toBe("⚙️");
  });
});

// ─── parsePhotoUrls ─────────────────────────────────────────────
describe("parsePhotoUrls", () => {
  it("returns empty array for falsy values", () => {
    expect(parsePhotoUrls(null)).toEqual([]);
    expect(parsePhotoUrls(undefined)).toEqual([]);
    expect(parsePhotoUrls("")).toEqual([]);
  });

  it("parses JSON array format", () => {
    const json = JSON.stringify(["url1.jpg", "url2.jpg"]);
    expect(parsePhotoUrls(json)).toEqual(["url1.jpg", "url2.jpg"]);
  });

  it("parses comma-separated format (legacy)", () => {
    expect(parsePhotoUrls("url1.jpg,url2.jpg,url3.jpg")).toEqual([
      "url1.jpg",
      "url2.jpg",
      "url3.jpg",
    ]);
  });

  it("handles single URL", () => {
    expect(parsePhotoUrls("url1.jpg")).toEqual(["url1.jpg"]);
  });

  it("filters out empty strings from comma-separated", () => {
    expect(parsePhotoUrls("url1.jpg,,url2.jpg")).toEqual([
      "url1.jpg",
      "url2.jpg",
    ]);
  });

  it("handles invalid JSON gracefully", () => {
    expect(parsePhotoUrls("[invalid-json")).toEqual(["[invalid-json"]);
  });
});

// ─── formatPhotoUrls ────────────────────────────────────────────
describe("formatPhotoUrls", () => {
  it("returns null for empty array", () => {
    expect(formatPhotoUrls([])).toBeNull();
    expect(formatPhotoUrls(["", ""])).toBeNull();
  });

  it("returns JSON string for non-empty array", () => {
    const result = formatPhotoUrls(["url1.jpg", "url2.jpg"]);
    expect(result).toBe(JSON.stringify(["url1.jpg", "url2.jpg"]));
  });
});

// ─── getWorkHoursOverlap ────────────────────────────────────────
describe("getWorkHoursOverlap", () => {
  const mkDate = (hours: number, minutes = 0) => {
    const d = new Date("2024-01-15T00:00:00");
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  it("returns 0 when start >= end", () => {
    const d = mkDate(10);
    expect(getWorkHoursOverlap(d, d)).toBe(0);
    expect(getWorkHoursOverlap(mkDate(11), mkDate(10))).toBe(0);
  });

  it("calculates full workday overlap (08:00-18:00 = 10h)", () => {
    const start = mkDate(8, 0);
    const end = mkDate(18, 0);
    const result = getWorkHoursOverlap(start, end);
    expect(result).toBe(10 * 60 * 60 * 1000); // 10 hours in ms
  });

  it("caps overlap at work hours boundaries", () => {
    const start = mkDate(6, 0); // before work hours
    const end = mkDate(20, 0); // after work hours
    const result = getWorkHoursOverlap(start, end);
    expect(result).toBe(10 * 60 * 60 * 1000); // still 10h
  });

  it("returns 0 for entirely out-of-hours range", () => {
    const start = mkDate(18, 1);
    const end = mkDate(19, 0);
    expect(getWorkHoursOverlap(start, end)).toBe(0);
  });

  it("calculates partial overlap", () => {
    const start = mkDate(10, 0);
    const end = mkDate(12, 0);
    const result = getWorkHoursOverlap(start, end);
    expect(result).toBe(2 * 60 * 60 * 1000); // 2 hours
  });
});

// ─── calculateTaskTimings ───────────────────────────────────────
describe("calculateTaskTimings", () => {
  const NOW = new Date("2024-01-15T14:00:00").getTime();

  it("returns zeros for task without started_at", () => {
    const result = calculateTaskTimings({ status: "pending" });
    expect(result.activeMs).toBe(0);
    expect(result.pausedMs).toBe(0);
    expect(result.totalMs).toBe(0);
  });

  it("calculates active time for running task", () => {
    const task = {
      started_at: "2024-01-15T10:00:00",
      completed_at: null,
      status: "progress",
      intervals: [],
    };
    const result = calculateTaskTimings(task, NOW);
    expect(result.activeMs).toBeGreaterThan(0);
    expect(result.pausedMs).toBe(0);
    expect(result.activePct).toBe(100);
  });

  it("calculates paused time from intervals", () => {
    const intervals: TaskInterval[] = [
      {
        paused_at: "2024-01-15T10:30:00",
        resumed_at: "2024-01-15T11:00:00",
        reason: "Pausa para almoço",
      },
    ];
    const task = {
      started_at: "2024-01-15T08:00:00",
      completed_at: "2024-01-15T14:00:00",
      status: "done",
      intervals,
    };
    const result = calculateTaskTimings(task, NOW);
    expect(result.pausedMs).toBeGreaterThan(0);
    expect(result.activeMs).toBeGreaterThan(0);
    expect(result.activePct + result.pausedPct).toBe(100);
  });
});

// ─── checkNeedsAutoPause ────────────────────────────────────────
describe("checkNeedsAutoPause", () => {
  it("returns needsPause: false for non-progress tasks", () => {
    const task = {
      started_at: "2024-01-15T10:00:00",
      created_at: "2024-01-15T09:00:00",
      status: "done",
      intervals: [],
    };
    expect(checkNeedsAutoPause(task).needsPause).toBe(false);
  });

  it("returns needsPause: false when within work hours", () => {
    const nowMs = new Date("2024-01-15T15:00:00").getTime();
    const task = {
      started_at: "2024-01-15T10:00:00",
      created_at: "2024-01-15T09:00:00",
      status: "progress",
      intervals: [],
    };
    expect(checkNeedsAutoPause(task, nowMs).needsPause).toBe(false);
  });

  it("returns needsPause: true when past 18:00", () => {
    const nowMs = new Date("2024-01-15T19:00:00").getTime();
    const task = {
      started_at: "2024-01-15T10:00:00",
      created_at: "2024-01-15T09:00:00",
      status: "progress",
      intervals: [],
    };
    const result = checkNeedsAutoPause(task, nowMs);
    expect(result.needsPause).toBe(true);
    expect(result.pausedAtIso).toBeDefined();
    expect(result.newIntervals?.length).toBe(1);
    expect(result.newIntervals?.[0].reason).toBe("Fim do Expediente");
  });
});
