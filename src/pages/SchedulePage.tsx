import { COMPETITION_DAYS, COMPETITION_NAME, SCHEDULE } from '../domain/competition'

export default function SchedulePage() {
  return (
    <div className="panel">
      <h2 className="panel-title">Schedule & key times</h2>
      <p className="schedule-note">
        <strong>{COMPETITION_NAME}</strong> is a <strong>five-day</strong> event,{' '}
        <strong>1–5 June 2026</strong> at Barcos. Each day below lists the calendar
        date and the key times that apply every fishing day.
      </p>
      <ul className="day-strip">
        {COMPETITION_DAYS.map((d) => (
          <li key={d.isoDate} className="day-chip">
            <span className="day-chip-num">Day {d.dayNumber}</span>
            <span className="day-chip-date">{d.label}</span>
          </li>
        ))}
      </ul>
      <dl className="schedule-dl">
        <div>
          <dt>Launch</dt>
          <dd>{SCHEDULE.launch}</dd>
        </div>
        <div>
          <dt>Lines up / return</dt>
          <dd>{SCHEDULE.linesUp}</dd>
        </div>
        <div>
          <dt>Weigh-in</dt>
          <dd>{SCHEDULE.weighIn}</dd>
        </div>
      </dl>
    </div>
  )
}
