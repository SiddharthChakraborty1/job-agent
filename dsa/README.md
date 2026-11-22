# Pattern Atlas — dsa.techside.in

DSA organised by **algorithm → data structure → questions**. Each technique has what it is, why it works, the cues that point to it, a Python template, common mistakes, and LeetCode questions with progressive hints (never full solutions).

Static site: Vite + React + TypeScript + three.js. No backend.

## Local

```powershell
cd dsa
npm install
npm run dev            # http://localhost:5173
npm run check-content  # validates ids, prereqs, slugs, hints
npm run build
```

## Editing content

All content lives in `src/data/phase1.ts` … `phase5.ts`. To add a question, add an object to the right `groups[].questions` list:

```ts
{ title: 'Two Sum', slug: 'two-sum', level: 'Easy', hints: ['…', '…'] }
```

`slug` is the part of the LeetCode URL after `/problems/`. A new algorithm needs an `id`, a `phase` (1–5) and `prereqs` (ids that draw the lines in the 3D map).

## Deploy (Vercel) — same pattern as the portfolio

1. vercel.com/new → import `SiddharthChakraborty1/job-agent`
2. **Project name:** `pattern-atlas` (any)
3. **Root Directory:** `dsa`
4. **Framework:** Vite (auto) · Build: `npm run build` · Output: `dist`
5. Settings → Git → **Production Branch:** `dsa-main`
6. Deploy. No environment variables needed.

## Custom domain: dsa.techside.in (GoDaddy)

1. Vercel project → Settings → Domains → add `dsa.techside.in`
2. GoDaddy → techside.in → DNS → **Add record**
   - Type: `CNAME`
   - Name: `dsa`
   - Value: the target Vercel shows (usually `cname.vercel-dns.com`)
   - TTL: default
3. Wait for Vercel to show "Valid configuration" (minutes, up to a few hours). SSL is automatic.

The portfolio's records for `techside.in` / `www` are not touched.
