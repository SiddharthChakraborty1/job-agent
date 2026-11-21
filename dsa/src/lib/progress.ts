import { useCallback, useSyncExternalStore } from 'react'

const KEY = 'pattern-atlas:solved:v1'
const listeners = new Set<() => void>()

function read(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

let solved = read()

function write(next: Set<string>) {
  solved = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    /* storage unavailable: keep in memory only */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Solved state lives in this browser only. */
export function useSolved() {
  const snapshot = useSyncExternalStore(subscribe, () => solved, () => solved)
  const toggle = useCallback((key: string) => {
    const next = new Set(solved)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    write(next)
  }, [])
  return { solved: snapshot, toggle }
}
