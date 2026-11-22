export type Level = 'Easy' | 'Medium' | 'Hard'

export interface Question {
  title: string
  /** LeetCode slug: https://leetcode.com/problems/<slug>/ */
  slug: string
  level: Level
  /** Progressive hints: from "what to notice" to "the key step". Never the full solution. */
  hints: string[]
}

export interface StructureGroup {
  /** The data structure the technique is applied to, e.g. "Array", "String", "Linked List". */
  structure: string
  /** How the technique looks on this structure. */
  note: string
  questions: Question[]
}

export interface Algorithm {
  id: string
  name: string
  phase: 1 | 2 | 3 | 4 | 5
  /** One-line summary shown on cards. */
  tagline: string
  /** What the technique is. */
  idea: string
  /** Why it is correct / what it saves over brute force. */
  why: string
  /** Signals in a problem statement that point to this technique. */
  cues: string[]
  /** Common mistakes. */
  pitfalls: string[]
  complexity: string
  /** Optional: where the technique does not apply, and why. */
  notFor?: string
  template: string
  /** Ids of algorithms worth knowing first (draws lines in the 3D map). */
  prereqs: string[]
  groups: StructureGroup[]
}

export const PHASES: Record<number, { name: string; color: string }> = {
  1: { name: 'Linear foundations', color: '#7dd3fc' },
  2: { name: 'Recursion & trees', color: '#86efac' },
  3: { name: 'Graphs', color: '#c4b5fd' },
  4: { name: 'Dynamic programming', color: '#fda4af' },
  5: { name: 'Specialised patterns', color: '#fcd34d' },
}

export const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`
