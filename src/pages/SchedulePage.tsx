import { useCompetition } from '../context/CompetitionContext'
import type { CompetitionDay } from '../domain/aggregates'

type Props = {
  days: CompetitionDay[]
}

export default function SchedulePage({ days }: Props) {
  const { viewCompetition, activeCompetition, schedule } = useCompetition()
  const comp = viewCompetition ?? activeCompetition
  const templateDays = schedule.days ?? []

  const dayStrip =
    days.length > 0
      ? days.map((d) => {
          const tpl = templateDays.find((t) => t.dayNumber === d.dayNumber)
          return {
            key: d.id,
            dayNumber: d.dayNumber,
            label: tpl?.label ?? d.dayDate,
          }
        })
      : templateDays.map((d) => ({
          key: d.isoDate,
          dayNumber: d.dayNumber,
          label: d.label,
        }))

  return (
    <div className="panel">
      <h2 className="panel-title">Schedule & key times</h2>
      <p className="schedule-note">
        <strong>{comp?.name ?? 'Competition'}</strong>
        {comp?.year ? ` · ${comp.year}` : ''}
        {schedule.venue || comp?.venue ? ` · ${schedule.venue ?? comp?.venue}` : ''}.
        Each day below lists the calendar date and the key times that apply every
        fishing day.
      </p>
      {dayStrip.length > 0 ? (
        <ul className="day-strip">
          {dayStrip.map((d) => (
            <li key={d.key} className="day-chip">
              <span className="day-chip-num">Day {d.dayNumber}</span>
              <span className="day-chip-date">{d.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-hint">No competition days configured yet.</p>
      )}
      <dl className="schedule-dl">
        <div>
          <dt>Launch</dt>
          <dd>{schedule.launch}</dd>
        </div>
        <div>
          <dt>Lines up / return</dt>
          <dd>{schedule.linesUp}</dd>
        </div>
        <div>
          <dt>Weigh-in</dt>
          <dd>{schedule.weighIn}</dd>
        </div>
      </dl>
    </div>
  )
}
