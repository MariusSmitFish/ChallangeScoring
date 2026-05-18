import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpeciesCategory, SpeciesRegistryEntry } from '../domain/species'

type SpeciesDb = {
  key: string
  label: string
  category: SpeciesCategory
  cap_group: string
  sort_order: number
  active: boolean
}

export function mapSpeciesRow(row: SpeciesDb): SpeciesRegistryEntry {
  return {
    key: row.key,
    label: row.label,
    category: row.category,
    capGroup: row.cap_group,
    sortOrder: row.sort_order,
    active: row.active,
  }
}

export async function fetchSpeciesRegistry(
  client: SupabaseClient,
  competitionId: string,
): Promise<{ entries: SpeciesRegistryEntry[]; error: string | null }> {
  const { data, error } = await client
    .from('species_registry')
    .select('key, label, category, cap_group, sort_order, active')
    .eq('competition_id', competitionId)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('key', { ascending: true })

  if (error) return { entries: [], error: error.message }
  return {
    entries: ((data ?? []) as SpeciesDb[]).map(mapSpeciesRow),
    error: null,
  }
}

const KEY_RE = /^[a-z][a-z0-9_]*$/

export function validateSpeciesKey(key: string): string | null {
  const k = key.trim().toLowerCase()
  if (!KEY_RE.test(k) || k.length > 64) {
    return 'Key must be lowercase letters, digits, underscores; start with a letter; max 64 chars.'
  }
  return null
}

export async function insertSpeciesEntry(
  client: SupabaseClient,
  competitionId: string,
  row: {
    key: string
    label: string
    category: SpeciesCategory
    capGroup: string
    sortOrder: number
    active: boolean
  },
): Promise<{ error: string | null }> {
  const err = validateSpeciesKey(row.key)
  if (err) return { error: err }
  const cap = row.capGroup.trim() || row.key.trim().toLowerCase()
  const { error } = await client.from('species_registry').insert({
    competition_id: competitionId,
    key: row.key.trim().toLowerCase(),
    label: row.label.trim(),
    category: row.category,
    cap_group: cap,
    sort_order: row.sortOrder,
    active: row.active,
  })
  return { error: error?.message ?? null }
}

export async function updateSpeciesEntry(
  client: SupabaseClient,
  competitionId: string,
  key: string,
  row: {
    label: string
    category: SpeciesCategory
    capGroup: string
    sortOrder: number
    active: boolean
  },
): Promise<{ error: string | null }> {
  const cap = row.capGroup.trim() || key
  const { error } = await client
    .from('species_registry')
    .update({
      label: row.label.trim(),
      category: row.category,
      cap_group: cap,
      sort_order: row.sortOrder,
      active: row.active,
      updated_at: new Date().toISOString(),
    })
    .eq('competition_id', competitionId)
    .eq('key', key)
  return { error: error?.message ?? null }
}

export async function deleteSpeciesByKey(
  client: SupabaseClient,
  competitionId: string,
  key: string,
): Promise<{ error: string | null }> {
  const { data, error, count } = await client
    .from('species_registry')
    .delete({ count: 'exact' })
    .eq('competition_id', competitionId)
    .eq('key', key)
    .select('key')

  if (error) return { error: error.message }

  const deleted =
    (typeof count === 'number' && count > 0) || (data != null && data.length > 0)
  if (!deleted) {
    return {
      error:
        'Delete did not remove any row. With Row Level Security this usually means the database blocked the delete (for example you are not signed in, or your user is not listed in app_admins). Run supabase-schema-05-species-registry-rls.sql after schema 03, then ensure you are signed in as an admin user that exists in public.app_admins.',
    }
  }
  return { error: null }
}
