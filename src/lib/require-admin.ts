import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Re-checked inside every title-mutating Server Action, not just the admin
// layout — Server Actions are reachable directly by anyone who can POST to
// them, regardless of which page rendered the form (Next.js Data Security
// guide: "always verify authentication and authorization inside each
// Server Action").
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "MAIN_ADMIN") notFound();

  return user;
}

// Platform-wide config (e.g. the review-gate settings, Entry 40) is scoped
// to the Main Admin specifically — "the Main Admin periodically reviews...
// and adjusts the gate's parameters" — not delegated to regular Admins.
export async function requireMainAdmin() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "MAIN_ADMIN") notFound();

  return user;
}
