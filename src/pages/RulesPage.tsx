import { RULE_SECTIONS } from '../domain/rulesSections'
import { COMPETITION_NAME } from '../domain/competition'

export default function RulesPage() {
  return (
    <div className="panel rules-panel">
      <h2 className="panel-title">Competition rules</h2>
      <p className="rules-intro">
        Official brief for <strong>{COMPETITION_NAME}</strong> — five consecutive
        days in June. Scoring logic in this app follows the summary below; confirm
        edge cases with the committee.
      </p>
      <div className="rules-sections">
        {RULE_SECTIONS.map((sec) => (
          <section key={sec.title} className="rules-block">
            <h3 className="rules-block-title">{sec.title}</h3>
            <ul>
              {sec.bullets.map((b, i) => (
                <li key={`${sec.title}-${i}`}>{b}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
