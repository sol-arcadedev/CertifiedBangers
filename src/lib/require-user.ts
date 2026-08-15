import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Any authenticated user — unlike requireAdmin, no role check. Re-checked
// inside submitReview itself, not just wherever the form is rendered (see
// the comment on requireAdmin for why).
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
