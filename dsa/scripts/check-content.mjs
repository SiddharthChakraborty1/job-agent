// Sanity checks for the content: unique ids, valid prereqs, slug format, 1+ hints.
// Run with: npm run check-content   (uses Vite's SSR loader to read the TS data)
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { algorithms } = await server.ssrLoadModule('/src/data/index.ts')
await server.close()

const errors = []
const ids = new Set()
let questions = 0
for (const a of algorithms) {
  if (ids.has(a.id)) errors.push(`duplicate algorithm id: ${a.id}`)
  ids.add(a.id)
}
for (const a of algorithms) {
  for (const p of a.prereqs) if (!ids.has(p)) errors.push(`${a.id}: unknown prereq ${p}`)
  if (!a.groups.length) errors.push(`${a.id}: no groups`)
  for (const g of a.groups) {
    const seen = new Set()
    for (const q of g.questions) {
      questions++
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.slug)) errors.push(`${a.id}/${q.title}: bad slug "${q.slug}"`)
      if (seen.has(q.slug)) errors.push(`${a.id}/${g.structure}: duplicate ${q.slug}`)
      seen.add(q.slug)
      if (!q.hints.length) errors.push(`${a.id}/${q.title}: no hints`)
    }
  }
}
console.log(`${algorithms.length} algorithms, ${questions} questions`)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('content OK')
