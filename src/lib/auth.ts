import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Joins the Supabase Auth session with this app's User profile row (same
// UUID — see the User model comment in schema.prisma). Returns null when
// signed out, or when the profile row hasn't been created yet.
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  return prisma.user.findUnique({ where: { id: authUser.id } });
}
