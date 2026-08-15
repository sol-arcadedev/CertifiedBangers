import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses Storage/DB RLS entirely. Only ever import
// this from Server Actions/Route Handlers that have already checked
// authorization themselves (e.g. requireAdmin()); never expose it to the
// client bundle.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
