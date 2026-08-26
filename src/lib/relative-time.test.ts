import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./relative-time";

const NOW = new Date("2026-08-26T12:00:00Z");

function minutesAgo(m: number) {
  return new Date(NOW.getTime() - m * 60 * 1000);
}
function hoursAgo(h: number) {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}
function daysAgo(d: number) {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);
}

describe("formatRelativeTime", () => {
  it("returns 'just now' for under a minute", () => {
    expect(formatRelativeTime(minutesAgo(0.5), NOW)).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    expect(formatRelativeTime(minutesAgo(1), NOW)).toBe("1m ago");
    expect(formatRelativeTime(minutesAgo(45), NOW)).toBe("45m ago");
  });

  it("returns hours for under a day", () => {
    expect(formatRelativeTime(hoursAgo(1), NOW)).toBe("1h ago");
    expect(formatRelativeTime(hoursAgo(23), NOW)).toBe("23h ago");
  });

  it("returns days for under the cutoff", () => {
    expect(formatRelativeTime(daysAgo(1), NOW)).toBe("1d ago");
    expect(formatRelativeTime(daysAgo(29), NOW)).toBe("29d ago");
  });

  it("falls back to an absolute date past the cutoff", () => {
    const result = formatRelativeTime(daysAgo(45), NOW);
    expect(result).not.toContain("ago");
    expect(result).toMatch(/\d{4}/);
  });
});
