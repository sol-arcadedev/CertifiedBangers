import { describe, it, expect } from "vitest";
import { computeApprovalStatus } from "./review-approval";

describe("computeApprovalStatus", () => {
  it("regular user reviews are always PUBLISHED and not admin-authored", () => {
    const result = computeApprovalStatus({ role: "USER", adminReviewsRequireApproval: true });
    expect(result).toEqual({ isAdminAuthored: false, approvalStatus: "PUBLISHED" });
  });

  it("admin with the gate on is PENDING_APPROVAL and admin-authored", () => {
    const result = computeApprovalStatus({ role: "ADMIN", adminReviewsRequireApproval: true });
    expect(result).toEqual({ isAdminAuthored: true, approvalStatus: "PENDING_APPROVAL" });
  });

  it("admin with the gate off is PUBLISHED but still admin-authored", () => {
    const result = computeApprovalStatus({ role: "ADMIN", adminReviewsRequireApproval: false });
    expect(result).toEqual({ isAdminAuthored: true, approvalStatus: "PUBLISHED" });
  });

  it("MAIN_ADMIN is always PUBLISHED regardless of the gate flag", () => {
    const gated = computeApprovalStatus({ role: "MAIN_ADMIN", adminReviewsRequireApproval: true });
    const ungated = computeApprovalStatus({ role: "MAIN_ADMIN", adminReviewsRequireApproval: false });
    expect(gated).toEqual({ isAdminAuthored: true, approvalStatus: "PUBLISHED" });
    expect(ungated).toEqual({ isAdminAuthored: true, approvalStatus: "PUBLISHED" });
  });
});
