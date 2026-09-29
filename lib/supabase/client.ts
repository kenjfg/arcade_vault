import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Supabase client for Client Components. createBrowserClient reuses a single
// instance per page, so calling this on every render is cheap.
export function createClient() {
  // Literal process.env reads: Next only inlines NEXT_PUBLIC_ vars written this way.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  return createBrowserClient<Database>(url, key);
}
