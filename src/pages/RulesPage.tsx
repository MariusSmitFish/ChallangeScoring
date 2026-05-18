import { useCompetition } from '../context/CompetitionContext'

export default function RulesPage() {
  const { viewCompetition, activeCompetition, rulesSections } = useCompetition()
  const comp = viewCompetition ?? activeCompetition

  return (
    <div className="panel rules-panel">
      <h2 className="panel-title">Competition rules</h2>
      <p className="rules-intro">
        Official brief for <strong>{comp?.name ?? 'this competition'}</strong>
        {comp?.year ? ` (${comp.year})` : ''}. Scoring logic in this app follows the
        summary below; confirm edge cases with the committee.
      </p>
      <div className="rules-sections">
        {rulesSections.map((sec) => (
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
