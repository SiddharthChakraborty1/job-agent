import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Code } from '../components/Code'
import { QuestionCard } from '../components/QuestionCard'
import { algorithms, byId, questionKey } from '../data'
import { PHASES } from '../data/types'
import { useSolved } from '../lib/progress'

export function AlgorithmPage() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { solved, toggle } = useSolved()
  const algo = byId.get(id)

  useEffect(() => {
    window.scrollTo({ top: 0 })
    if (algo) document.title = `${algo.name} · Pattern Atlas`
  }, [algo])

  if (!algo) {
    return (
      <main className="page narrow">
        <h1>Not found</h1>
        <p>
          No technique called “{id}”. <Link to="/">Back to the atlas</Link>
        </p>
      </main>
    )
  }

  const color = PHASES[algo.phase].color
  const active = algo.groups.find((g) => g.structure === params.get('ds')) ?? algo.groups[0]
  const idx = algorithms.indexOf(algo)
  const prev = algorithms[idx - 1]
  const next = algorithms[idx + 1]
  const all = algo.groups.flatMap((g) => g.questions.map((q) => questionKey(algo.id, q.slug)))
  const done = all.filter((k) => solved.has(k)).length

  return (
    <main className="page" style={{ ['--c' as string]: color }}>
      <nav className="crumbs">
        <Link to="/">Atlas</Link> <span>/</span> <span>Phase {algo.phase}</span> <span>/</span>{' '}
        <span className="here">{algo.name}</span>
      </nav>

      <header className="algo-head">
        <span className="pill">{PHASES[algo.phase].name}</span>
        <h1>{algo.name}</h1>
        <p className="lede">{algo.tagline}</p>
        <div className="algo-progress">
          <div className="bar">
            <span style={{ width: `${(done / all.length) * 100}%` }} />
          </div>
          <span className="muted">
            {done} of {all.length} solved
          </span>
        </div>
      </header>

      <div className="algo-layout">
        <div className="algo-learn">
          <section className="block">
            <h2>What it is</h2>
            <p>{algo.idea}</p>
          </section>
          <section className="block">
            <h2>Why it works</h2>
            <p>{algo.why}</p>
          </section>
          <section className="block cue-block">
            <h2>Cues — how you recognise it</h2>
            <ul className="cues">
              {algo.cues.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section className="block">
            <h2>Template (Python)</h2>
            <Code code={algo.template} />
            <p className="muted small">Complexity: {algo.complexity}</p>
          </section>
          <section className="block">
            <h2>Common mistakes</h2>
            <ul className="pitfalls">
              {algo.pitfalls.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
          {algo.notFor && (
            <section className="block note">
              <h2>Where it doesn’t apply</h2>
              <p>{algo.notFor}</p>
            </section>
          )}
          {algo.prereqs.length > 0 && (
            <section className="block">
              <h2>Learn first</h2>
              <div className="chips">
                {algo.prereqs.map((p) => (
                  <Link className="chip chip-link" key={p} to={`/a/${p}`}>
                    {byId.get(p)?.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="algo-practice">
          <h2 className="practice-title">Practice by data structure</h2>
          <div className="tabs" role="tablist">
            {algo.groups.map((g) => {
              const keys = g.questions.map((q) => questionKey(algo.id, q.slug))
              const d = keys.filter((k) => solved.has(k)).length
              return (
                <button
                  key={g.structure}
                  role="tab"
                  aria-selected={g === active}
                  className={`tab ${g === active ? 'active' : ''}`}
                  onClick={() => setParams({ ds: g.structure }, { replace: true })}
                >
                  {g.structure}
                  <span className="tab-count">
                    {d}/{g.questions.length}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="group-note">
            <strong>{algo.name} on {active.structure}:</strong> {active.note}
          </p>
          <div className="qlist">
            {active.questions.map((q) => {
              const key = questionKey(algo.id, q.slug)
              return <QuestionCard key={key} q={q} solved={solved.has(key)} onToggle={() => toggle(key)} />
            })}
          </div>
        </div>
      </div>

      <nav className="pager">
        {prev ? (
          <Link to={`/a/${prev.id}`} className="pager-link">
            <span className="muted">← Previous</span>
            {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/a/${next.id}`} className="pager-link right">
            <span className="muted">Next →</span>
            {next.name}
          </Link>
        )}
      </nav>
    </main>
  )
}
