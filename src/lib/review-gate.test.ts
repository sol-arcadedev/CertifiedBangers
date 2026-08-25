import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkReviewGate } from "./review-gate";

// vi.mock factories are hoisted above everything else in the file,
// including plain `const` declarations — vi.hoisted() is the documented
// way to define mock fns that need to exist by the time those factories
// run. checkReviewGate above already resolves against these mocked
// modules rather than the real Prisma/Auth/Settings implementations.
const { reviewCount, getAuthUser, getPlatformSettings } = vi.hoisted(() => ({
  reviewCount: vi.fn(),
  getAuthUser: vi.fn(),
  getPlatformSettings: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { review: { count: reviewCount } } }));
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@/lib/settings", () => ({ getPlatformSettings }));

describe("checkReviewGate", () => {
  beforeEach(() => {
    reviewCount.mockReset();
    getAuthUser.mockReset();
    getPlatformSettings.mockReset();
  });

  it("allows immediately when this isn't the user's first review ever (no email/age check needed)", async () => {
    reviewCount.mockResolvedValue(3);

    const result = await checkReviewGate("user-1", new Date());

    expect(result).toEqual({ allowed: true });
    expect(getAuthUser).not.toHaveBeenCalled();
  });

  it("blocks a first-time reviewer with an unverified email", async () => {
    reviewCount.mockResolvedValue(0);
    getAuthUser.mockResolvedValue({ email_confirmed_at: null });

    const result = await checkReviewGate("user-1", new Date());

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("Verify your email");
  });

  it("blocks a first-time reviewer whose account is too young", async () => {
    reviewCount.mockResolvedValue(0);
    getAuthUser.mockResolvedValue({ email_confirmed_at: "2026-01-01T00:00:00Z" });
    getPlatformSettings.mockResolvedValue({ minAccountAgeDays: 3 });

    const createdAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day old
    const result = await checkReviewGate("user-1", createdAt);

    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toContain("3 day(s)");
  });

  it("allows a first-time reviewer who is verified and old enough", async () => {
    reviewCount.mockResolvedValue(0);
    getAuthUser.mockResolvedValue({ email_confirmed_at: "2026-01-01T00:00:00Z" });
    getPlatformSettings.mockResolvedValue({ minAccountAgeDays: 3 });

    const createdAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days old
    const result = await checkReviewGate("user-1", createdAt);

    expect(result).toEqual({ allowed: true });
  });
});
