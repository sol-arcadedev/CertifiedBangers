import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client for use in Server Components, Server Actions,
// and Route Handlers. Must be created fresh per request (not a singleton)
// since it's bound to that request's cookies.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render, where cookies() is
            // read-only — safe to ignore because proxy.ts refreshes the
            // session cookie on every request anyway.
          }
        },
      },
    },
  );
}
