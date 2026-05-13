import {
  distinctSpeciesForDiversity,
  speciesDiversityBonus,
} from './scoringEngine'
import { roundPoints } from '../lib/formatPoints'
import { speciesDisplayLabel, type SpeciesRegistryEntry } from './species'
import type { Team } from '../types'

export type CatchRow = {
  id: string
  teamId: string
  anglerId: string
  competitionDayId: string
  catchKind: string
  speciesKey: string
  weightKg: number | null
  lengthCm: number | null
  billfishVariant: string | null
  pointsTotal: number
  notes: string | null
  /** ISO from DB; used to recompute fish points in cap order when hydrating. */
  createdAt: string | null
}

export type TeamDayOverride = {
  teamId: string
  competitionDayId: string
  disqualified: boolean
  reason: string | null
}

export type CompetitionDay = {
  id: string
  dayDate: string
  dayNumber: number
}

function isDq(
  overrides: TeamDayOverride[],
  teamId: string,
  dayId: string,
): boolean {
  return overrides.some(
    (o) =>
      o.teamId === teamId &&
      o.competitionDayId === dayId &&
      o.disqualified === true,
  )
}

function dqRowReason(
  overrides: TeamDayOverride[],
  teamId: string,
  dayId: string,
): string | null {
  const o = overrides.find(
    (x) =>
      x.teamId === teamId &&
      x.competitionDayId === dayId &&
      x.disqualified === true,
  )
  const r = o?.reason?.trim()
  return r || null
}

function anglerName(teams: Team[], anglerId: string): string | null {
  for (const t of teams) {
    const m = t.members.find((x) => x.id === anglerId)
    if (m) return m.name
  }
  return null
}

function formatCatchSpeciesDetail(
  c: CatchRow,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): string {
  const species = speciesDisplayLabel(c.speciesKey, speciesRegistry)
  if (c.catchKind === 'weighed_gamefish' && c.weightKg != null) {
    return `${species} · ${c.weightKg} kg`
  }
  if (c.catchKind === 'length_release' && c.lengthCm != null) {
    return `${species} · ${c.lengthCm} cm`
  }
  if (c.catchKind === 'billfish_release') {
    return `${species} · release`
  }
  return species
}

function formatCatchLineTeamBoard(
  c: CatchRow,
  teams: Team[],
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): string {
  const who = anglerName(teams, c.anglerId)
  const detail = formatCatchSpeciesDetail(c, speciesRegistry)
  return who ? `${who}: ${detail}` : detail
}

export type CatchContributionLine = {
  id: string
  label: string
  points: number
}

export type TeamDayPointsExplain = {
  competitionDayId: string
  dayNumber: number
  dayDate: string
  disqualified: boolean
  dqReason: string | null
  catchLines: CatchContributionLine[]
  fishPoints: number
  scoringSpeciesCount: number
  diversityBonus: number
  dayTotal: number
}

function buildTeamDayExplain(
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  teams: Team[],
  teamId: string,
  day: CompetitionDay,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): TeamDayPointsExplain {
  const list = catches.filter(
    (c) => c.teamId === teamId && c.competitionDayId === day.id,
  )
  const catchLines: CatchContributionLine[] = list
    .slice()
    .sort((a, b) => b.pointsTotal - a.pointsTotal)
    .map((c) => ({
      id: c.id,
      label: formatCatchLineTeamBoard(c, teams, speciesRegistry),
      points: c.pointsTotal,
    }))

  if (isDq(overrides, teamId, day.id)) {
    return {
      competitionDayId: day.id,
      dayNumber: day.dayNumber,
      dayDate: day.dayDate,
      disqualified: true,
      dqReason: dqRowReason(overrides, teamId, day.id),
      catchLines,
      fishPoints: 0,
      scoringSpeciesCount: 0,
      diversityBonus: 0,
      dayTotal: 0,
    }
  }

  const fishPoints = roundPoints(list.reduce((s, c) => s + c.pointsTotal, 0))
  const speciesSet = distinctSpeciesForDiversity(list, speciesRegistry)
  const scoringSpeciesCount = speciesSet.size
  const diversityBonus = speciesDiversityBonus(scoringSpeciesCount)
  return {
    competitionDayId: day.id,
    dayNumber: day.dayNumber,
    dayDate: day.dayDate,
    disqualified: false,
    dqReason: null,
    catchLines,
    fishPoints,
    scoringSpeciesCount,
    diversityBonus,
    dayTotal: roundPoints(fishPoints + diversityBonus),
  }
}

export function explainTeamOverallPoints(
  teams: Team[],
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  days: CompetitionDay[],
  teamId: string,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): { days: TeamDayPointsExplain[]; grandTotal: number } {
  const dayRows = days.map((d) =>
    buildTeamDayExplain(catches, overrides, teams, teamId, d, speciesRegistry),
  )
  const grandTotal = roundPoints(dayRows.reduce((s, r) => s + r.dayTotal, 0))
  return { days: dayRows, grandTotal }
}

export function explainTeamDayPoints(
  teams: Team[],
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  day: CompetitionDay,
  teamId: string,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): TeamDayPointsExplain {
  return buildTeamDayExplain(catches, overrides, teams, teamId, day, speciesRegistry)
}

export type AnglerDayPointsExplain = {
  competitionDayId: string
  dayNumber: number
  dayDate: string
  disqualified: boolean
  dqReason: string | null
  ownCatchLines: CatchContributionLine[]
  ownFishPoints: number
  /** Distinct scoring species cap groups in this angler’s catches that day (for diversity). */
  ownScoringSpeciesCount: number
  /** +2 per extra scoring species after the first, from this angler’s catches only. */
  ownDiversityBonus: number
  dayTotalRaw: number
  dayTotal: number
}

function buildAnglerDayExplain(
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  teamId: string,
  anglerId: string,
  day: CompetitionDay,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): AnglerDayPointsExplain {
  const ownList = catches.filter(
    (c) =>
      c.teamId === teamId &&
      c.competitionDayId === day.id &&
      c.anglerId === anglerId,
  )
  const ownCatchLines: CatchContributionLine[] = ownList
    .slice()
    .sort((a, b) => b.pointsTotal - a.pointsTotal)
    .map((c) => ({
      id: c.id,
      label: formatCatchSpeciesDetail(c, speciesRegistry),
      points: c.pointsTotal,
    }))

  if (isDq(overrides, teamId, day.id)) {
    return {
      competitionDayId: day.id,
      dayNumber: day.dayNumber,
      dayDate: day.dayDate,
      disqualified: true,
      dqReason: dqRowReason(overrides, teamId, day.id),
      ownCatchLines,
      ownFishPoints: 0,
      ownScoringSpeciesCount: 0,
      ownDiversityBonus: 0,
      dayTotalRaw: 0,
      dayTotal: 0,
    }
  }

  const ownFishPoints = roundPoints(ownList.reduce((s, c) => s + c.pointsTotal, 0))
  const ownSpeciesSet = distinctSpeciesForDiversity(ownList, speciesRegistry)
  const ownScoringSpeciesCount = ownSpeciesSet.size
  const ownDiversityBonus = speciesDiversityBonus(ownScoringSpeciesCount)
  const dayTotalRaw = roundPoints(ownFishPoints + ownDiversityBonus)
  return {
    competitionDayId: day.id,
    dayNumber: day.dayNumber,
    dayDate: day.dayDate,
    disqualified: false,
    dqReason: null,
    ownCatchLines,
    ownFishPoints,
    ownScoringSpeciesCount,
    ownDiversityBonus,
    dayTotalRaw,
    dayTotal: dayTotalRaw,
  }
}

export function explainAnglerOverallPoints(
  teams: Team[],
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  days: CompetitionDay[],
  anglerId: string,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): { perDay: AnglerDayPointsExplain[]; grandTotal: number } {
  const anglerTeam = new Map<string, string>()
  for (const t of teams) {
    for (const m of t.members) anglerTeam.set(m.id, t.id)
  }
  const tid = anglerTeam.get(anglerId)
  if (!tid) return { perDay: [], grandTotal: 0 }

  const perDay = days.map((d) =>
    buildAnglerDayExplain(catches, overrides, tid, anglerId, d, speciesRegistry),
  )
  const rawGrand = roundPoints(perDay.reduce((s, r) => s + r.dayTotalRaw, 0))
  return {
    perDay,
    grandTotal: rawGrand,
  }
}

export function explainAnglerDayPoints(
  teams: Team[],
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  day: CompetitionDay,
  anglerId: string,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): AnglerDayPointsExplain | null {
  const anglerTeam = new Map<string, string>()
  for (const t of teams) {
    for (const m of t.members) anglerTeam.set(m.id, t.id)
  }
  const tid = anglerTeam.get(anglerId)
  if (!tid) return null
  return buildAnglerDayExplain(catches, overrides, tid, anglerId, day, speciesRegistry)
}

export function leaderboardTeamOverall(
  teams: Team[],
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  days: CompetitionDay[],
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): { teamId: string; name: string; points: number }[] {
  const dayIds = new Set(days.map((d) => d.id))
  const byTeam = new Map<string, number>()

  const catchesByTeamDay = new Map<string, CatchRow[]>()
  for (const c of catches) {
    if (!dayIds.has(c.competitionDayId)) continue
    const k = `${c.teamId}:${c.competitionDayId}`
    const list = catchesByTeamDay.get(k) ?? []
    list.push(c)
    catchesByTeamDay.set(k, list)
  }

  for (const t of teams) {
    let total = 0
    for (const d of days) {
      if (isDq(overrides, t.id, d.id)) continue
      const list = catchesByTeamDay.get(`${t.id}:${d.id}`) ?? []
      const fish = roundPoints(list.reduce((s, c) => s + c.pointsTotal, 0))
      const div = speciesDiversityBonus(
        distinctSpeciesForDiversity(list, speciesRegistry).size,
      )
      total += fish + div
    }
    byTeam.set(t.id, roundPoints(total))
  }

  return teams
    .map((t) => ({
      teamId: t.id,
      name: t.name,
      points: roundPoints(byTeam.get(t.id) ?? 0),
    }))
    .sort((a, b) => b.points - a.points)
}

export function leaderboardAnglerOverall(
  teams: Team[],
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  days: CompetitionDay[],
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): { anglerId: string; name: string; teamId: string; teamName: string; points: number }[] {
  const dayIds = new Set(days.map((d) => d.id))
  const byAngler = new Map<string, number>()

  const catchesByTeamDay = new Map<string, CatchRow[]>()
  for (const c of catches) {
    if (!dayIds.has(c.competitionDayId)) continue
    const k = `${c.teamId}:${c.competitionDayId}`
    const list = catchesByTeamDay.get(k) ?? []
    list.push(c)
    catchesByTeamDay.set(k, list)
  }

  const anglerTeam = new Map<string, string>()
  for (const t of teams) {
    for (const m of t.members) anglerTeam.set(m.id, t.id)
  }

  const anglerIds = new Set<string>()
  for (const t of teams) for (const m of t.members) anglerIds.add(m.id)

  for (const anglerId of anglerIds) {
    let pts = 0
    const tid = anglerTeam.get(anglerId)
    if (!tid) continue
    for (const d of days) {
      if (isDq(overrides, tid, d.id)) continue
      const list = catchesByTeamDay.get(`${tid}:${d.id}`) ?? []
      const ownList = list.filter((x) => x.anglerId === anglerId)
      const ownFish = roundPoints(
        ownList.reduce((s, x) => s + x.pointsTotal, 0),
      )
      const ownDiv = speciesDiversityBonus(
        distinctSpeciesForDiversity(ownList, speciesRegistry).size,
      )
      pts += ownFish + ownDiv
    }
    byAngler.set(anglerId, roundPoints(pts))
  }

  const rows: {
    anglerId: string
    name: string
    teamId: string
    teamName: string
    points: number
  }[] = []
  for (const t of teams) {
    for (const m of t.members) {
      rows.push({
        anglerId: m.id,
        name: m.name,
        teamId: t.id,
        teamName: t.name,
        points: roundPoints(byAngler.get(m.id) ?? 0),
      })
    }
  }
  return rows.sort((a, b) => b.points - a.points)
}

export function leaderboardTeamByDay(
  teams: Team[],
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  day: CompetitionDay,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): { teamId: string; name: string; points: number }[] {
  const listByTeam = new Map<string, CatchRow[]>()
  for (const c of catches) {
    if (c.competitionDayId !== day.id) continue
    const list = listByTeam.get(c.teamId) ?? []
    list.push(c)
    listByTeam.set(c.teamId, list)
  }

  return teams
    .map((t) => {
      if (isDq(overrides, t.id, day.id)) {
        return { teamId: t.id, name: t.name, points: 0 }
      }
      const list = listByTeam.get(t.id) ?? []
      const fish = roundPoints(list.reduce((s, c) => s + c.pointsTotal, 0))
      const div = speciesDiversityBonus(
        distinctSpeciesForDiversity(list, speciesRegistry).size,
      )
      return { teamId: t.id, name: t.name, points: roundPoints(fish + div) }
    })
    .sort((a, b) => b.points - a.points)
}

export function leaderboardAnglerByDay(
  teams: Team[],
  catches: CatchRow[],
  overrides: TeamDayOverride[],
  day: CompetitionDay,
  speciesRegistry?: SpeciesRegistryEntry[] | null,
): { anglerId: string; name: string; teamId: string; teamName: string; points: number }[] {
  const anglerTeam = new Map<string, string>()
  for (const t of teams) {
    for (const m of t.members) anglerTeam.set(m.id, t.id)
  }

  const list = catches.filter((c) => c.competitionDayId === day.id)
  const byTeam = new Map<string, CatchRow[]>()
  for (const c of list) {
    const arr = byTeam.get(c.teamId) ?? []
    arr.push(c)
    byTeam.set(c.teamId, arr)
  }

  const rows: {
    anglerId: string
    name: string
    teamId: string
    teamName: string
    points: number
  }[] = []

  for (const t of teams) {
    if (isDq(overrides, t.id, day.id)) {
      for (const m of t.members) {
        rows.push({
          anglerId: m.id,
          name: m.name,
          teamId: t.id,
          teamName: t.name,
          points: 0,
        })
      }
      continue
    }
    const teamList = byTeam.get(t.id) ?? []
    for (const m of t.members) {
      const ownList = teamList.filter((c) => c.anglerId === m.id)
      const ownFish = roundPoints(
        ownList.reduce((s, c) => s + c.pointsTotal, 0),
      )
      const ownDiv = speciesDiversityBonus(
        distinctSpeciesForDiversity(ownList, speciesRegistry).size,
      )
      rows.push({
        anglerId: m.id,
        name: m.name,
        teamId: t.id,
        teamName: t.name,
        points: roundPoints(ownFish + ownDiv),
      })
    }
  }

  return rows.sort((a, b) => b.points - a.points)
}

export { speciesCapKey } from './species'
