import { createServerClient } from "@supabase/ssr"

/**
 * Server-side Supabase client for API routes
 * Uses service_role key which bypasses RLS
 * NEVER expose this to the client
 */
export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase server environment variables")
  }

  return createServerClient(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() { },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}