import { type FormEvent, useState } from 'react'
import ViewOnlyBanner from '../components/ViewOnlyBanner'
import {
  SCORE_CATEGORIES,
  SCORE_CATEGORY_LABELS,
  type ScoreCategory,
} from '../domain/scoreCategory'
import type { TeamMember } from '../types'
import type { UseTeamsResult } from '../hooks/useTeams'

type TeamsPageProps = UseTeamsResult & {
  canMutate: boolean
}

export default function TeamsPage({
  canMutate,
  ...t
}: TeamsPageProps) {
  const blocked = t.misconfigured || t.loading || t.syncing || !canMutate
  const [newTeamName, setNewTeamName] = useState('')
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(() => new Set())

  function toggleTeamCollapsed(teamId: string) {
    setCollapsedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  function collapseAllTeams() {
    setCollapsedTeams(new Set(t.teams.map((team) => team.id)))
  }

  function expandAllTeams() {
    setCollapsedTeams(new Set())
  }

  function handleAddTeam(e: FormEvent) {
    e.preventDefault()
    t.addTeam(newTeamName)
    setNewTeamName('')
  }

  return (
    <section className="panel" aria-labelledby="teams-heading">
      <h2 id="teams-heading" className="panel-title">
        Teams & anglers
      </h2>

      <ViewOnlyBanner
        show={!t.misconfigured && !t.loading && !canMutate}
      />

      {t.syncing && !t.loading ? (
        <p className="panel-syncing-hint" role="status">
          <span className="btn-spinner" aria-hidden="true" />
          Saving changes…
        </p>
      ) : null}

      <form className="inline-form" onSubmit={handleAddTeam}>
        <label className="sr-only" htmlFor="new-team-name">
          New team name
        </label>
        <input
          id="new-team-name"
          className="input"
          type="text"
          placeholder="Team name"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          autoComplete="off"
          maxLength={120}
          disabled={blocked}
        />
        <button type="submit" className="btn btn-primary" disabled={blocked}>
          Add team
        </button>
      </form>

      {t.misconfigured ? (
        <p className="empty-hint">
          Configure Supabase using the variables above, then refresh this page.
        </p>
      ) : t.loading ? (
        <p className="empty-hint">Loading teams…</p>
      ) : t.teams.length === 0 ? (
        <p className="empty-hint">No teams yet. Add the first team above.</p>
      ) : (
        <>
          {t.teams.length > 1 ? (
            <div className="team-list-toolbar">
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={collapseAllTeams}
              >
                Collapse all
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={expandAllTeams}
              >
                Expand all
              </button>
            </div>
          ) : null}
          <ul className="team-list">
          {t.teams.map((team) => {
            const collapsed = collapsedTeams.has(team.id)
            return (
            <li
              key={team.id}
              className={`team-card${collapsed ? ' team-card-collapsed' : ''}`}
            >
              <TeamRow
                teamId={team.id}
                teamName={team.name}
                memberCount={team.members.length}
                collapsed={collapsed}
                disabled={blocked}
                onToggleCollapse={() => toggleTeamCollapsed(team.id)}
                onRename={(name) => t.renameTeam(team.id, name)}
                onRemove={() => t.removeTeam(team.id)}
              />
              {!collapsed ? (
              <MemberSection
                teamId={team.id}
                members={team.members}
                disabled={blocked}
                onAddMember={(name, scoreCategory) =>
                  t.addMember(team.id, name, scoreCategory)
                }
                onRenameMember={(memberId, name) =>
                  t.renameMember(team.id, memberId, name)
                }
                onSetMemberScoreCategory={(memberId, scoreCategory) =>
                  t.setMemberScoreCategory(team.id, memberId, scoreCategory)
                }
                onRemoveMember={(memberId) =>
                  t.removeMember(team.id, memberId)
                }
              />
              ) : null}
            </li>
          )})}
        </ul>
        </>
      )}
    </section>
  )
}

type TeamRowProps = {
  teamId: string
  teamName: string
  memberCount: number
  collapsed: boolean
  disabled?: boolean
  onToggleCollapse: () => void
  onRename: (name: string) => void
  onRemove: () => void
}

function TeamRow({
  teamId,
  teamName,
  memberCount,
  collapsed,
  disabled = false,
  onToggleCollapse,
  onRename,
  onRemove,
}: TeamRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(teamName)
  const membersId = `team-members-${teamId}`

  function save() {
    onRename(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="team-row">
        <button
          type="button"
          className="team-collapse-btn"
          aria-expanded={!collapsed}
          aria-controls={membersId}
          disabled={disabled}
          onClick={onToggleCollapse}
        >
          {collapsed ? '▸' : '▾'}
        </button>
        <input
          className="input input-grow"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setValue(teamName)
              setEditing(false)
            }
          }}
          autoFocus
          maxLength={120}
          disabled={disabled}
          aria-label="Edit team name"
        />
        <button type="button" className="btn btn-ghost" onClick={save} disabled={disabled}>
          Save
        </button>
      </div>
    )
  }

  return (
    <div className="team-row">
      <button
        type="button"
        className="team-collapse-btn"
        aria-expanded={!collapsed}
        aria-controls={membersId}
        aria-label={collapsed ? `Expand ${teamName}` : `Collapse ${teamName}`}
        onClick={onToggleCollapse}
      >
        {collapsed ? '▸' : '▾'}
      </button>
      <h3 className="team-name">{teamName}</h3>
      {collapsed ? (
        <span className="team-member-count">
          {memberCount === 1 ? '1 member' : `${memberCount} members`}
        </span>
      ) : null}
      <div className="team-actions">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled}
          onClick={() => {
            setValue(teamName)
            setEditing(true)
          }}
        >
          Rename
        </button>
        <button type="button" className="btn btn-danger" disabled={disabled} onClick={onRemove}>
          Remove team
        </button>
      </div>
    </div>
  )
}

type MemberSectionProps = {
  teamId: string
  members: TeamMember[]
  disabled?: boolean
  onAddMember: (name: string, scoreCategory: ScoreCategory | null) => void
  onRenameMember: (memberId: string, name: string) => void
  onSetMemberScoreCategory: (
    memberId: string,
    scoreCategory: ScoreCategory | null,
  ) => void
  onRemoveMember: (memberId: string) => void
}

function MemberSection({
  teamId,
  members,
  disabled = false,
  onAddMember,
  onRenameMember,
  onSetMemberScoreCategory,
  onRemoveMember,
}: MemberSectionProps) {
  const [draft, setDraft] = useState('')
  const [draftCategory, setDraftCategory] = useState<ScoreCategory | ''>('')
  const newMemberInputId = `new-member-${teamId}`
  const newMemberCategoryId = `new-member-category-${teamId}`

  function handleAddMember(e: FormEvent) {
    e.preventDefault()
    onAddMember(draft, draftCategory || null)
    setDraft('')
    setDraftCategory('')
  }

  return (
    <div className="members" id={`team-members-${teamId}`}>
      <h4 className="members-heading">Members</h4>
      <form className="inline-form member-form" onSubmit={handleAddMember}>
        <label className="sr-only" htmlFor={newMemberInputId}>
          New member name
        </label>
        <input
          id={newMemberInputId}
          className="input"
          type="text"
          placeholder="Angler name"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="name"
          maxLength={120}
          disabled={disabled}
        />
        <button type="submit" className="btn btn-secondary" disabled={disabled}>
          Add member
        </button>
        <label className="member-category-field" htmlFor={newMemberCategoryId}>
          <span className="sr-only">Score category</span>
          <ScoreCategorySelect
            id={newMemberCategoryId}
            value={draftCategory}
            disabled={disabled}
            onChange={setDraftCategory}
            allowUnset
          />
        </label>
      </form>

      {members.length === 0 ? (
        <p className="empty-hint small">No members yet.</p>
      ) : (
        <ul className="member-list">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              disabled={disabled}
              onRename={(name) => onRenameMember(m.id, name)}
              onScoreCategoryChange={(scoreCategory) =>
                onSetMemberScoreCategory(m.id, scoreCategory)
              }
              onRemove={() => onRemoveMember(m.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

type ScoreCategorySelectProps = {
  id?: string
  value: ScoreCategory | ''
  disabled?: boolean
  allowUnset?: boolean
  onChange: (value: ScoreCategory | '') => void
}

function ScoreCategorySelect({
  id,
  value,
  disabled = false,
  allowUnset = false,
  onChange,
}: ScoreCategorySelectProps) {
  return (
    <select
      id={id}
      className="input member-category-select"
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? '' : (v as ScoreCategory))
      }}
      aria-label="Score category"
    >
      {allowUnset ? <option value="">Not set</option> : null}
      {SCORE_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {SCORE_CATEGORY_LABELS[c]}
        </option>
      ))}
    </select>
  )
}

type MemberRowProps = {
  member: TeamMember
  disabled?: boolean
  onRename: (name: string) => void
  onScoreCategoryChange: (scoreCategory: ScoreCategory | null) => void
  onRemove: () => void
}

function MemberRow({
  member,
  disabled = false,
  onRename,
  onScoreCategoryChange,
  onRemove,
}: MemberRowProps) {
  const { name, scoreCategory } = member
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  function save() {
    onRename(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="member-row">
        <input
          className="input input-grow"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setValue(name)
              setEditing(false)
            }
          }}
          autoFocus
          maxLength={120}
          disabled={disabled}
          aria-label="Edit member name"
        />
        <button type="button" className="btn btn-ghost" onClick={save} disabled={disabled}>
          Save
        </button>
      </li>
    )
  }

  return (
    <li className="member-row">
      <span className="member-name">{name}</span>
      <ScoreCategorySelect
        value={scoreCategory ?? ''}
        disabled={disabled}
        allowUnset
        onChange={(v) => onScoreCategoryChange(v || null)}
      />
      <div className="member-actions">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          disabled={disabled}
          onClick={() => {
            setValue(name)
            setEditing(true)
          }}
        >
          Rename
        </button>
        <button
          type="button"
          className="btn btn-danger btn-small"
          disabled={disabled}
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </li>
  )
}
