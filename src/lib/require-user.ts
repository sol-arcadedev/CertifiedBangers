import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Any authenticated user — unlike requireAdmin, no role check. Re-checked
// inside submitReview itself, not just wherever the form is rendered (see
// the comment on requireAdmin for why). Also the single choke point for
// WP6.1's suspend/ban enforcement: every write action (review, comment,
// vote, report, library) goes through requireUser, so gating here covers
// all of them without touching each action individually.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.status !== "ACTIVE") redirect("/account-restricted");
  return user;
}
