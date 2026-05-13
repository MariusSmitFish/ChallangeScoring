import type { SupabaseClient } from '@supabase/supabase-js'

export type CommitteeUpdate = {
  id: string
  title: string
  body: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

type RawRow = {
  id: string
  title: string
  body: string
  published_at: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: RawRow): CommitteeUpdate {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function sortCommitteeUpdates(rows: CommitteeUpdate[]): CommitteeUpdate[] {
  const published = rows.filter((r) => r.publishedAt)
  const drafts = rows.filter((r) => !r.publishedAt)
  published.sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))
  drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return [...published, ...drafts]
}

export async function fetchCommitteeUpdates(
  client: SupabaseClient,
): Promise<{ updates: CommitteeUpdate[]; error: string | null }> {
  const { data, error } = await client
    .from('committee_updates')
    .select('id, title, body, published_at, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) return { updates: [], error: error.message }
  const rows = (data ?? []) as RawRow[]
  return { updates: sortCommitteeUpdates(rows.map(mapRow)), error: null }
}

export type InsertCommitteeUpdateInput = {
  title: string
  body: string
  publish: boolean
}

export async function insertCommitteeUpdate(
  client: SupabaseClient,
  input: InsertCommitteeUpdateInput,
): Promise<{ error: string | null }> {
  const now = new Date().toISOString()
  const { error } = await client.from('committee_updates').insert({
    title: input.title.trim(),
    body: input.body.trim(),
    published_at: input.publish ? now : null,
    updated_at: now,
  })
  return { error: error?.message ?? null }
}

export type PatchCommitteeUpdate = {
  title: string
  body: string
  /** null = draft; ISO string = published (use existing timestamp to keep publish date). */
  publishedAt: string | null
}

export async function updateCommitteeUpdate(
  client: SupabaseClient,
  id: string,
  patch: PatchCommitteeUpdate,
): Promise<{ error: string | null }> {
  const now = new Date().toISOString()
  const { error } = await client
    .from('committee_updates')
    .update({
      title: patch.title.trim(),
      body: patch.body.trim(),
      published_at: patch.publishedAt,
      updated_at: now,
    })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteCommitteeUpdate(
  client: SupabaseClient,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await client.from('committee_updates').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export function validateCommitteeUpdateTitle(title: string): string | null {
  const t = title.trim()
  if (!t) return 'Title is required.'
  if (t.length > 500) return 'Title must be 500 characters or fewer.'
  return null
}

export function validateCommitteeUpdateBody(body: string): string | null {
  if (body.length > 20000) return 'Body must be 20,000 characters or fewer.'
  return null
}
