import { createServerClient } from "@supabase/ssr";
import { createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Check if Supabase env vars are configured */
function hasSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Stub client for mock mode — never throws, returns null for all queries */
function createStubClient() {
  return {
    from: () => ({
      select: () => ({ data: null, error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  };
}

/**
 * Supabase client for server components and route handlers.
 * Returns stub in mock mode or when env vars are missing.
 */
export function getSupabase() {
  if (!hasSupabase()) return createStubClient() as ReturnType<typeof createServerClient>;
  
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
 * Returns stub in mock mode or when env vars are missing.
 */
export function getSupabaseBrowser() {
  if (!hasSupabase()) return createStubClient() as ReturnType<typeof createBrowserClient>;
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
