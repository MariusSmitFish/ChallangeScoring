import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

/** Project URL only (https://….supabase.co). Strips accidental /rest/v1 suffix. */
function normalizeSupabaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '')
  if (u.endsWith('/rest/v1')) {
    u = u.slice(0, -'/rest/v1'.length).replace(/\/+$/, '')
  }
  return u
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached
  const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!rawUrl || !key) {
    cached = null
    return null
  }
  const url = normalizeSupabaseUrl(rawUrl)
  cached = createClient(url, key)
  return cached
}
