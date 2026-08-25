import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// supabase.auth.getUser() always makes a network round-trip to Supabase's
// Auth server to revalidate the JWT (deliberately, unlike getSession() —
// that's what makes it safe to trust server-side). Entry 61: this is the
// single shared choke point for that call — getCurrentUser() below and
// review-gate.ts's checkReviewGate() both used to call it independently
// (three call sites total once Header's own getCurrentUser() call is
// counted), meaning a logged-in user on their first-ever review could pay
// for it three separate times in one request. Wrapped in React's cache()
// so every caller within a single request's render shares one network
// round-trip.
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  return authUser;
});

// Joins the Supabase Auth session with this app's User profile row (same
// UUID — see the User model comment in schema.prisma). Returns null when
// signed out, or when the profile row hasn't been created yet.
export const getCurrentUser = cache(async () => {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  return prisma.user.findUnique({ where: { id: authUser.id } });
});
