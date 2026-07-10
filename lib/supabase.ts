import { createServerClient } from "@supabase/ssr";
import { createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for server components and route handlers.
 * Uses @supabase/ssr createServerClient with cookie access.
 */
export function getSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

/**
 * Supabase client for client components (browser).
 * Uses @supabase/ssr createBrowserClient.
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
