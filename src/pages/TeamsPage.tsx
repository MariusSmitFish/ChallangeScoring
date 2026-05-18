import { type FormEvent, useState } from 'react'
import ViewOnlyBanner from '../components/ViewOnlyBanner'
import type { UseTeamsResult } from '../hooks/useTeams'

type TeamsPageProps = UseTeamsResult & {
  canMutate: boolean
  signedInNonAdmin: boolean
}

export default function TeamsPage({
  canMutate,
  signedInNonAdmin,
  ...t
}: TeamsPageProps) {
  const blocked = t.misconfigured || t.loading || t.syncing || !canMutate
  const [newTeamName, setNewTeamName] = useState('')

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
        signedInNonAdmin={signedInNonAdmin}
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
        <ul className="team-list">
          {t.teams.map((team) => (
            <li key={team.id} className="team-card">
              <TeamRow
                teamName={team.name}
                disabled={blocked}
                onRename={(name) => t.renameTeam(team.id, name)}
                onRemove={() => t.removeTeam(team.id)}
              />
              <MemberSection
                teamId={team.id}
                members={team.members}
                disabled={blocked}
                onAddMember={(name) => t.addMember(team.id, name)}
                onRenameMember={(memberId, name) =>
                  t.renameMember(team.id, memberId, name)
                }
                onRemoveMember={(memberId) =>
                  t.removeMember(team.id, memberId)
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type TeamRowProps = {
  teamName: string
  disabled?: boolean
  onRename: (name: string) => void
  onRemove: () => void
}

function TeamRow({ teamName, disabled = false, onRename, onRemove }: TeamRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(teamName)

  function save() {
    onRename(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="team-row">
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
      <h3 className="team-name">{teamName}</h3>
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
  members: { id: string; name: string }[]
  disabled?: boolean
  onAddMember: (name: string) => void
  onRenameMember: (memberId: string, name: string) => void
  onRemoveMember: (memberId: string) => void
}

function MemberSection({
  teamId,
  members,
  disabled = false,
  onAddMember,
  onRenameMember,
  onRemoveMember,
}: MemberSectionProps) {
  const [draft, setDraft] = useState('')
  const newMemberInputId = `new-member-${teamId}`

  function handleAddMember(e: FormEvent) {
    e.preventDefault()
    onAddMember(draft)
    setDraft('')
  }

  return (
    <div className="members">
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
      </form>

      {members.length === 0 ? (
        <p className="empty-hint small">No members yet.</p>
      ) : (
        <ul className="member-list">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              name={m.name}
              disabled={disabled}
              onRename={(name) => onRenameMember(m.id, name)}
              onRemove={() => onRemoveMember(m.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

type MemberRowProps = {
  name: string
  disabled?: boolean
  onRename: (name: string) => void
  onRemove: () => void
}

function MemberRow({ name, disabled = false, onRename, onRemove }: MemberRowProps) {
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
