export type TeamMember = {
  id: string
  name: string
}

export type Team = {
  id: string
  name: string
  members: TeamMember[]
}
