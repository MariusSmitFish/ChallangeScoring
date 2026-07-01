import type { ScoreCategory } from './domain/scoreCategory'

export type TeamMember = {
  id: string
  name: string
  scoreCategory: ScoreCategory | null
}

export type Team = {
  id: string
  name: string
  members: TeamMember[]
}
