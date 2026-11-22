import { useState } from 'react'
import type { Question } from '../data/types'
import { leetcodeUrl } from '../data/types'

interface Props {
  q: Question
  solved: boolean
  onToggle: () => void
}

export function QuestionCard({ q, solved, onToggle }: Props) {
  const [shown, setShown] = useState(0)
  const all = shown >= q.hints.length

  return (
    <article className={`qcard ${solved ? 'is-solved' : ''}`}>
      <header className="qcard-head">
        <label className="check" title={solved ? 'Mark as not solved' : 'Mark as solved'}>
          <input type="checkbox" checked={solved} onChange={onToggle} />
          <span aria-hidden />
        </label>
        <a className="qcard-title" href={leetcodeUrl(q.slug)} target="_blank" rel="noreferrer">
          {q.title}
          <svg viewBox="0 0 16 16" aria-hidden>
            <path d="M6 3h7v7M13 3 4 12" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </a>
        <span className={`level level-${q.level.toLowerCase()}`}>{q.level}</span>
      </header>

      {shown > 0 && (
        <ol className="hints">
          {q.hints.slice(0, shown).map((h, i) => (
            <li key={i}>
              <span className="hint-n">Hint {i + 1}</span>
              {h}
            </li>
          ))}
        </ol>
      )}

      <div className="qcard-actions">
        {!all ? (
          <button className="btn-ghost" onClick={() => setShown((s) => s + 1)}>
            {shown === 0 ? 'Show a hint' : 'Next hint'}
            <span className="muted">
              {' '}
              {shown}/{q.hints.length}
            </span>
          </button>
        ) : (
          <button className="btn-ghost" onClick={() => setShown(0)}>
            Hide hints
          </button>
        )}
        <a className="btn-link" href={leetcodeUrl(q.slug)} target="_blank" rel="noreferrer">
          Solve on LeetCode
        </a>
      </div>
    </article>
  )
}
