import { phase1 } from './phase1'
import { phase2 } from './phase2'
import { phase3 } from './phase3'
import { phase4 } from './phase4'
import { phase5 } from './phase5'
import type { Algorithm } from './types'

export const algorithms: Algorithm[] = [...phase1, ...phase2, ...phase3, ...phase4, ...phase5]

export const byId = new Map(algorithms.map((a) => [a.id, a]))

export const questionCount = algorithms.reduce(
  (n, a) => n + a.groups.reduce((m, g) => m + g.questions.length, 0),
  0,
)

export const questionKey = (algoId: string, slug: string) => `${algoId}:${slug}`

/** Every data structure, with the algorithms that apply to it. */
export const structures = (() => {
  const map = new Map<string, { algo: Algorithm; count: number }[]>()
  for (const a of algorithms) {
    for (const g of a.groups) {
      const list = map.get(g.structure) ?? []
      list.push({ algo: a, count: g.questions.length })
      map.set(g.structure, list)
    }
  }
  return [...map.entries()].sort((x, y) => y[1].length - x[1].length)
})()
