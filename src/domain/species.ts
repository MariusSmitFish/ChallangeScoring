/** Normalized species keys for caps, diversity, and UI (billfish use these keys on catch rows). */
export const SPECIES_KEYS = {
  marlin: 'marlin',
  sailfish: 'sailfish',
  kingfish: 'kingfish',
  kakaap: 'kakaap',
  queenfish: 'queenfish',
  barracuda: 'barracuda',
  yellowfin: 'yellowfin_tuna',
  bigeye: 'bigeye_tuna',
  longfin: 'longfin_tuna',
  skipjack: 'skipjack_tuna',
  wahoo: 'wahoo',
  dorado: 'dorado',
  other_gamefish: 'other_gamefish',
} as const

export type SpeciesKey = (typeof SPECIES_KEYS)[keyof typeof SPECIES_KEYS]

export type SpeciesCategory = 'weighed_gamefish' | 'length_release'

/** Row from `species_registry` (or client-side equivalent). */
export type SpeciesRegistryEntry = {
  key: string
  label: string
  category: SpeciesCategory
  capGroup: string
  sortOrder: number
  active: boolean
}

/** Derived rules for scoring when the registry is loaded. */
export type SpeciesRulesSnapshot = {
  lengthSpeciesKeys: Set<string>
  weighedSpeciesKeys: Set<string>
  capGroupByKey: Map<string, string>
}

export function buildSpeciesRulesSnapshot(
  entries: SpeciesRegistryEntry[] | null | undefined,
): SpeciesRulesSnapshot | null {
  if (!entries?.length) return null
  const capGroupByKey = new Map<string, string>()
  const lengthSpeciesKeys = new Set<string>()
  const weighedSpeciesKeys = new Set<string>()
  for (const e of entries) {
    const cg = e.capGroup.trim() || e.key
    capGroupByKey.set(e.key, cg)
    if (e.category === 'length_release') lengthSpeciesKeys.add(e.key)
    if (e.category === 'weighed_gamefish') weighedSpeciesKeys.add(e.key)
  }
  return { lengthSpeciesKeys, weighedSpeciesKeys, capGroupByKey }
}

/** Fallback lists when Supabase has no rows yet (same keys as seeded SQL). */
export const DEFAULT_WEIGHED_SPECIES_OPTIONS: readonly { key: SpeciesKey; label: string }[] =
  [
    { key: SPECIES_KEYS.yellowfin, label: 'Yellowfin tuna' },
    { key: SPECIES_KEYS.bigeye, label: 'Bigeye tuna' },
    { key: SPECIES_KEYS.longfin, label: 'Longfin tuna' },
    { key: SPECIES_KEYS.skipjack, label: 'Skipjack tuna' },
    { key: SPECIES_KEYS.wahoo, label: 'Wahoo' },
    { key: SPECIES_KEYS.dorado, label: 'Dorado / mahi-mahi' },
    { key: SPECIES_KEYS.queenfish, label: 'Queenfish' },
    { key: SPECIES_KEYS.barracuda, label: 'Barracuda (any species)' },
    { key: SPECIES_KEYS.other_gamefish, label: 'Other gamefish (weighed)' },
  ]

export const DEFAULT_LENGTH_SPECIES_OPTIONS: readonly { key: SpeciesKey; label: string }[] =
  [
    { key: SPECIES_KEYS.kingfish, label: 'Kingfish (all treated as one species)' },
    { key: SPECIES_KEYS.kakaap, label: 'Green jobfish / kakaap' },
  ]

/** @deprecated Use context / registry options; kept for imports that expect the old name. */
export const WEIGHED_SPECIES_OPTIONS = DEFAULT_WEIGHED_SPECIES_OPTIONS
/** @deprecated Use context / registry options */
export const LENGTH_SPECIES_OPTIONS = DEFAULT_LENGTH_SPECIES_OPTIONS

function legacySpeciesCapKey(speciesKey: string): string {
  if (speciesKey === SPECIES_KEYS.marlin) return SPECIES_KEYS.marlin
  if (speciesKey === SPECIES_KEYS.kingfish) return SPECIES_KEYS.kingfish
  return speciesKey
}

/** Cap / diversity grouping for a species key; uses registry `cap_group` when rows are loaded. */
export function speciesCapKey(
  speciesKey: string,
  registry?: SpeciesRegistryEntry[] | null,
): string {
  if (registry?.length) {
    const row = registry.find((e) => e.key === speciesKey)
    if (row) {
      const g = row.capGroup.trim()
      return g || row.key
    }
  }
  return legacySpeciesCapKey(speciesKey)
}

/** Short label for tables and summaries (includes billfish species keys). */
export function speciesDisplayLabel(
  speciesKey: string,
  registry?: SpeciesRegistryEntry[] | null,
): string {
  if (speciesKey === SPECIES_KEYS.sailfish) return 'Sailfish'
  if (speciesKey === SPECIES_KEYS.marlin) return 'Marlin'
  if (registry?.length) {
    const row = registry.find((e) => e.key === speciesKey)
    if (row) return row.label
  }
  const fromDefaults = [...DEFAULT_WEIGHED_SPECIES_OPTIONS, ...DEFAULT_LENGTH_SPECIES_OPTIONS].find(
    (o) => o.key === speciesKey,
  )
  return fromDefaults?.label ?? speciesKey
}

export function weighedSpeciesOptionsFromRegistry(
  entries: SpeciesRegistryEntry[] | null | undefined,
): { key: string; label: string }[] {
  if (!entries?.length) {
    return DEFAULT_WEIGHED_SPECIES_OPTIONS.map((o) => ({ key: o.key, label: o.label }))
  }
  return entries
    .filter((e) => e.active && e.category === 'weighed_gamefish')
    .sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key))
    .map((e) => ({ key: e.key, label: e.label }))
}

export function lengthSpeciesOptionsFromRegistry(
  entries: SpeciesRegistryEntry[] | null | undefined,
): { key: string; label: string }[] {
  if (!entries?.length) {
    return DEFAULT_LENGTH_SPECIES_OPTIONS.map((o) => ({ key: o.key, label: o.label }))
  }
  return entries
    .filter((e) => e.active && e.category === 'length_release')
    .sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key))
    .map((e) => ({ key: e.key, label: e.label }))
}
