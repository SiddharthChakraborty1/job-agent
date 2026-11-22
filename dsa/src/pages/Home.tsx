import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { algorithms, questionCount, questionKey } from '../data'
import { PHASES } from '../data/types'
import { useSolved } from '../lib/progress'

const Constellation = lazy(() =>
  import('../components/Constellation').then((m) => ({ default: m.Constellation })),
)

export function Home() {
  const [query, setQuery] = useState('')
  const { solved } = useSolved()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return algorithms
    return algorithms.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.tagline.toLowerCase().includes(q) ||
        a.cues.some((c) => c.toLowerCase().includes(q)) ||
        a.groups.some(
          (g) => g.structure.toLowerCase().includes(q) || g.questions.some((x) => x.title.toLowerCase().includes(q)),
        ),
    )
  }, [query])

  const phases = [1, 2, 3, 4, 5] as const

  return (
    <>
      <section className="hero">
        <Suspense fallback={null}>
          <Constellation />
        </Suspense>
        <div className="hero-copy">
          <p className="eyebrow">DSA, organised the way you recognise it</p>
          <h1>
            Learn the <em>algorithm</em>,<br />
            then the questions.
          </h1>
          <p className="lede">
            {algorithms.length} techniques → the data structures they work on → {questionCount} hinted LeetCode
            questions. Every technique comes with what it is, why it works, and the cues that give it away.
          </p>
          <div className="hero-actions">
            <a href="#atlas" className="btn">
              Browse the atlas
            </a>
            <Link to="/structures" className="btn-ghost">
              Browse by data structure
            </Link>
          </div>
        </div>
        <ul className="legend" aria-label="Phases">
          {phases.map((p) => (
            <li key={p} style={{ ['--c' as string]: PHASES[p].color }}>
              {PHASES[p].name}
            </li>
          ))}
        </ul>
      </section>

      <section id="atlas" className="atlas">
        <div className="atlas-bar">
          <h2>The atlas</h2>
          <input
            className="search"
            type="search"
            placeholder="Search a technique, cue, data structure or question…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {phases.map((p) => {
          const list = filtered.filter((a) => a.phase === p)
          if (!list.length) return null
          return (
            <div key={p} className="phase" style={{ ['--c' as string]: PHASES[p].color }}>
              <h3 className="phase-title">
                <span>Phase {p}</span> {PHASES[p].name}
              </h3>
              <div className="grid">
                {list.map((a) => {
                  const keys = a.groups.flatMap((g) => g.questions.map((q) => questionKey(a.id, q.slug)))
                  const done = keys.filter((k) => solved.has(k)).length
                  return (
                    <Link key={a.id} to={`/a/${a.id}`} className="card">
                      <div className="card-top">
                        <strong>{a.name}</strong>
                        <span className="muted">
                          {done}/{keys.length}
                        </span>
                      </div>
                      <p>{a.tagline}</p>
                      <div className="chips">
                        {a.groups.map((g) => (
                          <span className="chip" key={g.structure}>
                            {g.structure}
                          </span>
                        ))}
                      </div>
                      <div className="bar">
                        <span style={{ width: `${(done / keys.length) * 100}%` }} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
        {!filtered.length && <p className="muted center">Nothing matches “{query}”.</p>}
      </section>
    </>
  )
}
