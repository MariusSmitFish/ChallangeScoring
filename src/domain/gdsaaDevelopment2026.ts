import type { RulesSection, ScheduleConfig, ScoringConfig } from './competitionConfig'

export const GDSAA_SLUG = 'gdsaa-development-2026'
export const GDSAA_NAME = 'GDSAA Development Tournament'

export const GDSAA_SCHEDULE: ScheduleConfig = {
  venue: 'GDSAA venue (weather committee)',
  launch:
    'Fishing times as determined by the weather committee on Sunday night before each day.',
  linesUp: 'Lines up 14:00 (or as adjusted by the weather committee for the day).',
  weighIn:
    'Weigh-in: scale open 16:00, close 17:00. Teams reporting late are disqualified for the day. Weigh sheets signed by the team captain at weigh-in.',
  days: [
    { dayNumber: 1, isoDate: '2026-07-06', label: 'Mon 6 Jul' },
    { dayNumber: 2, isoDate: '2026-07-07', label: 'Tue 7 Jul' },
    { dayNumber: 3, isoDate: '2026-07-08', label: 'Wed 8 Jul' },
    { dayNumber: 4, isoDate: '2026-07-09', label: 'Thu 9 Jul' },
    { dayNumber: 5, isoDate: '2026-07-10', label: 'Fri 10 Jul' },
  ],
}

/** GDSAA 2026 scoring — species factor multiplies boat fish points; per-group length tables. */
export const GDSAA_SCORING: ScoringConfig = {
  minWeighKg: 4,
  bonusOver10Kg: 5,
  speciesDiversityPerExtra: 0,
  maxPerSpeciesPerBoatDay: 6,
  billfishPoints: { sailfish: 20, marlin: 50 },
  lengthTiers: [],
  diversityMode: 'multiplier',
  speciesCountMultipliers: [
    { minSpecies: 1, multiplier: 1 },
    { minSpecies: 3, multiplier: 2 },
    { minSpecies: 4, multiplier: 2.5 },
    { minSpecies: 5, multiplier: 3 },
    { minSpecies: 6, multiplier: 3.5 },
  ],
  billfishPointsByVariant: {
    marlin: 50,
    sailfish: 20,
    spearfish: 20,
    broadbill: 30,
  },
  bonusPerScoringFishAfterFirst: 1,
  lengthTiersByGroup: {
    release_standard: [
      { minCm: 70, maxCm: 80, points: 5 },
      { minCm: 80, maxCm: 90, points: 10 },
      { minCm: 90, maxCm: 100, points: 15 },
      { minCm: 100, points: 20 },
    ],
    release_barracuda: [
      { minCm: 90, maxCm: 100, points: 5 },
      { minCm: 100, maxCm: 110, points: 10 },
      { minCm: 110, maxCm: 120, points: 15 },
      { minCm: 120, points: 20 },
    ],
  },
}

export const GDSAA_RULES: RulesSection[] = [
  {
    title: 'General',
    bullets: [
      'IGFA rules and standards apply. Boats found contravening any of these rules can be disqualified for the day.',
      'Gamefish only — no bottom fish.',
      'Line class: 10 kg.',
    ],
  },
  {
    title: 'Tag and release',
    bullets: [
      'All billfish, green jobfish, kingfish, amberjacks, tropical yellowtail, and all barracuda species must be released.',
      'Billfish release must be photographed or videoed, clearly identifying the species and showing the leader through the rod eye or bill in hand before release.',
      'Other release species must be photographed showing the length of the fish with the provided tape.',
    ],
  },
  {
    title: 'Minimum weights & bag limits',
    bullets: [
      'Bag limit of 6 of a species per boat per day, unless the official bag limit is less than 6 for a specific species, in which case the official bag limit applies.',
      'All tuna species and all other gamefish: minimum weight 4 kg on the scale.',
    ],
  },
  {
    title: 'Points and scoring',
    bullets: [
      '1 point per kg for all fish weighed in over the minimum weight.',
      'Species factor (boat per day): 3 scoring species → day fish points × 2; 4 species → × 2.5; 5 → × 3; 6 → × 3.5 (see scoring config in app).',
      '5 bonus points per fish weighed in over 10 kg.',
      '1 bonus point for each additional scoring fish after the first fish on the boat that day.',
      'Released billfish: all marlin 50 pts; sailfish 20 pts; all spearfish 20 pts; broadbill 30 pts.',
      'Kingfish, amberjacks, tropical yellowtail, and green jobfish: length table 70–79.9 cm = 5 pts; 80–89.9 = 10; 90–99.9 = 15; 100 cm+ = 20.',
      'All barracuda species: length table 90–99.9 cm = 5 pts; 100–109.9 = 10; 110–119.9 = 15; 120 cm+ = 20.',
      'No more than two lines per angler in the water at any time.',
      'Skippers and captains act as referee and report rule transgressions to the organisers.',
    ],
  },
  {
    title: 'Teams',
    bullets: [
      'Anglers must have a valid fishing licence. No guests on the boats.',
      'GDSAA Interclub: minimum 50% of crew must be fully paid-up GDSAA members; non-members pay temporary membership at the club they represent.',
      'Open Interclub section: above membership rule does not apply. Qualifying GDSAA boats compete in both Interclub sections.',
    ],
  },
  {
    title: 'Fishing times & weigh-in',
    bullets: [
      'Times set by the weather committee (Sunday night). Lines up 14:00 unless shortened.',
      'Weigh-in: scale open 16:00, close 17:00. Late teams disqualified for the day.',
      'Fish hooked before lines-up: report to another competition boat; 1 hour extra time allowed.',
    ],
  },
  {
    title: 'Weather',
    bullets: [
      'Weather committee decides each day; may call the day off or shorten fishing hours.',
      'No angler may continue fighting a fish once the day is called off.',
      'Tournament called off automatically if wind exceeds 22 knots.',
      'If any formal competition at the same venue is called off, GDSAA is called off at the same time.',
    ],
  },
  {
    title: 'Protests & prizes',
    bullets: [
      'Protests in writing with R500 deposit to weigh master within one hour of scale close; result within two hours of scale close (deposit forfeited if unsuccessful).',
      'Prize giving Friday after weigh-in (teams, individuals by category, biggest fish species, Interclub club aggregate, etc.).',
    ],
  },
]

export const GDSAA_SPECIES_SEED = [
  { key: 'yellowfin_tuna', label: 'Yellowfin tuna', category: 'weighed_gamefish' as const, cap_group: 'yellowfin_tuna', sort_order: 10 },
  { key: 'bigeye_tuna', label: 'Bigeye tuna', category: 'weighed_gamefish' as const, cap_group: 'bigeye_tuna', sort_order: 20 },
  { key: 'longfin_tuna', label: 'Longfin tuna', category: 'weighed_gamefish' as const, cap_group: 'longfin_tuna', sort_order: 30 },
  { key: 'skipjack_tuna', label: 'Skipjack tuna', category: 'weighed_gamefish' as const, cap_group: 'skipjack_tuna', sort_order: 40 },
  { key: 'wahoo', label: 'Wahoo', category: 'weighed_gamefish' as const, cap_group: 'wahoo', sort_order: 50 },
  { key: 'dorado', label: 'Dorado / mahi-mahi', category: 'weighed_gamefish' as const, cap_group: 'dorado', sort_order: 60 },
  { key: 'queen_mackerel', label: 'Queen mackerel', category: 'weighed_gamefish' as const, cap_group: 'queen_mackerel', sort_order: 70 },
  { key: 'king_mackerel', label: 'King mackerel', category: 'weighed_gamefish' as const, cap_group: 'king_mackerel', sort_order: 80 },
  { key: 'other_gamefish', label: 'Other gamefish (weighed)', category: 'weighed_gamefish' as const, cap_group: 'other_gamefish', sort_order: 90 },
  { key: 'kingfish', label: 'Kingfish', category: 'length_release' as const, cap_group: 'release_standard', sort_order: 10 },
  { key: 'kakaap', label: 'Green jobfish / kakaap', category: 'length_release' as const, cap_group: 'release_standard', sort_order: 20 },
  { key: 'amberjack', label: 'Amberjack', category: 'length_release' as const, cap_group: 'release_standard', sort_order: 30 },
  { key: 'tropical_yellowtail', label: 'Tropical yellowtail', category: 'length_release' as const, cap_group: 'release_standard', sort_order: 40 },
  { key: 'barracuda', label: 'Barracuda (any species)', category: 'length_release' as const, cap_group: 'release_barracuda', sort_order: 50 },
]
