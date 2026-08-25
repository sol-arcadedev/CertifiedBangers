// Pure — split out of src/lib/actions/reviews.ts (Entry 64) rather than just
// exported in place: every export from a "use server" file must be an async
// Server Function, which this deliberately isn't.
//
// Entry 28: only non-Main-Admin admin reviews are gated; Main Admin (no one
// above them to approve against) and regular users are unaffected. Entry 41:
// the per-admin exemption (adminReviewsRequireApproval=false) is a manual
// trust call, not automatic.
export function computeApprovalStatus(user: { role: string; adminReviewsRequireApproval: boolean }) {
  return {
    isAdminAuthored: user.role !== "USER",
    approvalStatus:
      user.role === "ADMIN" && user.adminReviewsRequireApproval
        ? ("PENDING_APPROVAL" as const)
        : ("PUBLISHED" as const),
  };
}
