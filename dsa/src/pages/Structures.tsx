import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { structures } from '../data'
import { PHASES } from '../data/types'

export function Structures() {
  useEffect(() => {
    window.scrollTo({ top: 0 })
    document.title = 'By data structure · Pattern Atlas'
  }, [])

  return (
    <main className="page">
      <nav className="crumbs">
        <Link to="/">Atlas</Link> <span>/</span> <span className="here">By data structure</span>
      </nav>
      <header className="algo-head">
        <h1>By data structure</h1>
        <p className="lede">
          The same data structure shows up under many techniques. Pick a structure to see which algorithms apply to
          it.
        </p>
      </header>
      <div className="ds-grid">
        {structures.map(([name, list]) => (
          <section className="ds-card" key={name}>
            <h2>{name}</h2>
            <ul>
              {list.map(({ algo, count }) => (
                <li key={algo.id} style={{ ['--c' as string]: PHASES[algo.phase].color }}>
                  <Link to={`/a/${algo.id}?ds=${encodeURIComponent(name)}`}>
                    <span className="dot" />
                    {algo.name}
                  </Link>
                  <span className="muted">{count}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
