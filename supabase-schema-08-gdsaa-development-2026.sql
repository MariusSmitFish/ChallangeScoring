-- Run after supabase-schema-07-competitions.sql
-- Seeds GDSAA Development Tournament (6–10 July 2026) and sets it as the public active competition.

-- Allow extra billfish variants on catches
alter table public.catches drop constraint if exists catches_billfish_variant_ck;
alter table public.catches add constraint catches_billfish_variant_ck check (
  billfish_variant is null
  or billfish_variant in ('sailfish', 'marlin', 'spearfish', 'broadbill')
);

update public.competitions set is_active = false where is_active = true;

insert into public.competitions (
  slug,
  name,
  is_active,
  year,
  venue,
  rules_config,
  scoring_config,
  schedule_config
)
values (
  'gdsaa-development-2026',
  'GDSAA Development Tournament',
  true,
  2026,
  'GDSAA',
  $rules$[
    {"title":"General","bullets":["IGFA rules and standards apply. Boats found contravening any of these rules can be disqualified for the day.","Gamefish only — no bottom fish.","Line class: 10 kg."]},
    {"title":"Tag and release","bullets":["All billfish, green jobfish, kingfish, amberjacks, tropical yellowtail, and all barracuda species must be released.","Billfish release must be photographed or videoed, clearly identifying the species and showing the leader through the rod eye or bill in hand before release.","Other release species must be photographed showing the length of the fish with the provided tape."]},
    {"title":"Minimum weights & bag limits","bullets":["Bag limit of 6 of a species per boat per day, unless the official bag limit is less than 6 for a specific species, in which case the official bag limit applies.","All tuna species and all other gamefish: minimum weight 4 kg on the scale."]},
    {"title":"Points and scoring","bullets":["1 point per kg for all fish weighed in over the minimum weight.","Species factor (boat per day): 3 scoring species → day fish points × 2; 4 species → × 2.5; 5 → × 3; 6 → × 3.5.","5 bonus points per fish weighed in over 10 kg.","1 bonus point for each additional scoring fish after the first fish on the boat that day.","Released billfish: all marlin 50 pts; sailfish 20 pts; all spearfish 20 pts; broadbill 30 pts.","Kingfish, amberjacks, tropical yellowtail, and green jobfish: length table 70–79.9 cm = 5 pts; 80–89.9 = 10; 90–99.9 = 15; 100 cm+ = 20.","All barracuda species: length table 90–99.9 cm = 5 pts; 100–109.9 = 10; 110–119.9 = 15; 120 cm+ = 20."]},
    {"title":"Teams","bullets":["Anglers must have a valid fishing licence. No guests on the boats.","GDSAA Interclub: minimum 50% of crew must be fully paid-up GDSAA members.","Open Interclub section: membership rule does not apply. Qualifying GDSAA boats compete in both Interclub sections."]},
    {"title":"Fishing times & weigh-in","bullets":["Times set by the weather committee (Sunday night). Lines up 14:00 unless shortened.","Weigh-in: scale open 16:00, close 17:00. Late teams disqualified for the day.","Fish hooked before lines-up: report to another competition boat; 1 hour extra time allowed."]},
    {"title":"Weather","bullets":["Weather committee decides each day; may call the day off or shorten fishing hours.","No angler may continue fighting a fish once the day is called off.","Tournament called off automatically if wind exceeds 22 knots.","If any formal competition at the same venue is called off, GDSAA is called off at the same time."]},
    {"title":"Protests & prizes","bullets":["Protests in writing with R500 deposit to weigh master within one hour of scale close.","Prize giving Friday after weigh-in."]}
  ]$rules$::jsonb,
  $scoring${
    "minWeighKg": 4,
    "bonusOver10Kg": 5,
    "speciesDiversityPerExtra": 0,
    "maxPerSpeciesPerBoatDay": 6,
    "billfishPoints": { "sailfish": 20, "marlin": 50 },
    "lengthTiers": [],
    "diversityMode": "multiplier",
    "speciesCountMultipliers": [
      { "minSpecies": 1, "multiplier": 1 },
      { "minSpecies": 3, "multiplier": 2 },
      { "minSpecies": 4, "multiplier": 2.5 },
      { "minSpecies": 5, "multiplier": 3 },
      { "minSpecies": 6, "multiplier": 3.5 }
    ],
    "billfishPointsByVariant": {
      "marlin": 50,
      "sailfish": 20,
      "spearfish": 20,
      "broadbill": 30
    },
    "bonusPerScoringFishAfterFirst": 1,
    "lengthTiersByGroup": {
      "release_standard": [
        { "minCm": 70, "maxCm": 80, "points": 5 },
        { "minCm": 80, "maxCm": 90, "points": 10 },
        { "minCm": 90, "maxCm": 100, "points": 15 },
        { "minCm": 100, "points": 20 }
      ],
      "release_barracuda": [
        { "minCm": 90, "maxCm": 100, "points": 5 },
        { "minCm": 100, "maxCm": 110, "points": 10 },
        { "minCm": 110, "maxCm": 120, "points": 15 },
        { "minCm": 120, "points": 20 }
      ]
    }
  }$scoring$::jsonb,
  $schedule${
    "venue": "GDSAA venue (weather committee)",
    "launch": "Fishing times as determined by the weather committee on Sunday night before each day.",
    "linesUp": "Lines up 14:00 (or as adjusted by the weather committee for the day).",
    "weighIn": "Weigh-in: scale open 16:00, close 17:00. Teams reporting late are disqualified for the day. Weigh sheets signed by the team captain at weigh-in.",
    "days": [
      { "dayNumber": 1, "isoDate": "2026-07-06", "label": "Mon 6 Jul" },
      { "dayNumber": 2, "isoDate": "2026-07-07", "label": "Tue 7 Jul" },
      { "dayNumber": 3, "isoDate": "2026-07-08", "label": "Wed 8 Jul" },
      { "dayNumber": 4, "isoDate": "2026-07-09", "label": "Thu 9 Jul" },
      { "dayNumber": 5, "isoDate": "2026-07-10", "label": "Fri 10 Jul" }
    ]
  }$schedule$::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  is_active = excluded.is_active,
  year = excluded.year,
  venue = excluded.venue,
  rules_config = excluded.rules_config,
  scoring_config = excluded.scoring_config,
  schedule_config = excluded.schedule_config,
  updated_at = now();

-- Competition days
insert into public.competition_days (competition_id, day_date, day_number)
select c.id, d.day_date::date, d.day_number
from public.competitions c
cross join (
  values
    ('2026-07-06'::date, 1),
    ('2026-07-07', 2),
    ('2026-07-08', 3),
    ('2026-07-09', 4),
    ('2026-07-10', 5)
) as d(day_date, day_number)
where c.slug = 'gdsaa-development-2026'
on conflict (competition_id, day_date) do nothing;

-- Species catalogue
insert into public.species_registry (
  competition_id, key, label, category, cap_group, sort_order, active
)
select
  c.id,
  s.key,
  s.label,
  s.category,
  s.cap_group,
  s.sort_order,
  true
from public.competitions c
cross join (
  values
    ('yellowfin_tuna', 'Yellowfin tuna', 'weighed_gamefish', 'yellowfin_tuna', 10),
    ('bigeye_tuna', 'Bigeye tuna', 'weighed_gamefish', 'bigeye_tuna', 20),
    ('longfin_tuna', 'Longfin tuna', 'weighed_gamefish', 'longfin_tuna', 30),
    ('skipjack_tuna', 'Skipjack tuna', 'weighed_gamefish', 'skipjack_tuna', 40),
    ('wahoo', 'Wahoo', 'weighed_gamefish', 'wahoo', 50),
    ('dorado', 'Dorado / mahi-mahi', 'weighed_gamefish', 'dorado', 60),
    ('queen_mackerel', 'Queen mackerel', 'weighed_gamefish', 'queen_mackerel', 70),
    ('king_mackerel', 'King mackerel', 'weighed_gamefish', 'king_mackerel', 80),
    ('other_gamefish', 'Other gamefish (weighed)', 'weighed_gamefish', 'other_gamefish', 90),
    ('kingfish', 'Kingfish', 'length_release', 'release_standard', 10),
    ('kakaap', 'Green jobfish / kakaap', 'length_release', 'release_standard', 20),
    ('amberjack', 'Amberjack', 'length_release', 'release_standard', 30),
    ('tropical_yellowtail', 'Tropical yellowtail', 'length_release', 'release_standard', 40),
    ('barracuda', 'Barracuda (any species)', 'length_release', 'release_barracuda', 50)
) as s(key, label, category, cap_group, sort_order)
where c.slug = 'gdsaa-development-2026'
on conflict (competition_id, key) do update set
  label = excluded.label,
  category = excluded.category,
  cap_group = excluded.cap_group,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
