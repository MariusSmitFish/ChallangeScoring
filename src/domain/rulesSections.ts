/** Human-readable rules for the Rules screen (aligned with committee brief). */
export const RULE_SECTIONS: readonly { title: string; bullets: readonly string[] }[] =
  [
    {
      title: 'Fishing days',
      bullets: [
        'The competition runs five consecutive days: 1–5 June 2026.',
      ],
    },
    {
      title: 'Launch',
      bullets: [
        'Launch from Barcos or an approved committee launch site.',
        'First light; tractors push boats; wait behind the back line.',
        'A flare starts the day once all boats are launched.',
      ],
    },
    {
      title: 'Lines up & return',
      bullets: [
        'No lines-up time.',
        'By 15h00 every boat must be behind the backline (≈100m of Barcos beach).',
        'Behind the line: radio beach control, report, request permission to beach.',
        'One boat beaches at a time (tractors).',
        'Not behind the backline and radioed by 15h00 → disqualified for the day.',
      ],
    },
    {
      title: 'IGFA & tackle',
      bullets: ['IGFA rules apply.', 'Line class is open.', 'No limits on fishing areas.', 'Jigging is allowed.'],
    },
    {
      title: 'Weigh-in',
      bullets: ['Weigh-in 17h00 at Barcos.'],
    },
    {
      title: 'Fish, species & points (summary)',
      bullets: [
        'All gamefish count (subject to per-species caps and minimum weights).',
        'Max 6 fish of a species per boat per day (grouped species: all marlin = one species; all kingfish = one species).',
        'Weighed fish (except kingfish/kakaap rules below): minimum 4 kg on the scale; 1 point per kg including decimals (e.g. 12.4 kg = 12.4 pts); +5 bonus if over 10 kg.',
        'All billfish must be released. Video with fish in hand + timestamp at scale; sailfish = 15 pts; marlin = 25 pts (all marlin one species).',
        'Green jobfish (kakaap) counts. Kingfish & kakaap: measure & release only — 70–80 cm = 5 pts, 80–100 cm = 10 pts, over 100 cm = 15 pts; no >10 kg bonus.',
        'Queenfish and all barracuda species: bring to scale (weighed scoring path).',
        'Species diversity (team totals): +2 points per distinct scoring species from the 2nd species onwards, per boat per day (whole team’s catches that day).',
        'Species diversity (angler totals): same +2 rule, but distinct species are counted only from that angler’s own catches (per day or summed over days for overall).',
        'Life jackets must be worn when launching and beaching — failure → DQ for that day and zero points for the day.',
      ],
    },
    {
      title: 'Scoring in this app',
      bullets: [
        'Points are tracked per team and per angler, overall and per competition day.',
        'Use Score entry to record fish; use Leaderboards to view totals (respecting day disqualifications when flagged).',
      ],
    },
  ]
