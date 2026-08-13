# Resume Job Finder

Upload a resume, and a multi-agent pipeline finds matching roles across startups, mid-level
companies, and enterprises, then scores each match against the resume.

**Pipeline:** resume text extraction → DorkingAgent (Google dork queries) → three Search Agents
in parallel (startup / midlevel / enterprise, via Serper/Google) → deduplication → ValidationAgent
(0–100 alignment score) → results streamed to the UI over Server-Sent Events.

- **Backend:** FastAPI + OpenAI Agents SDK (Python)
- **Frontend:** React + TypeScript + Vite

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- An OpenAI API key
- A Serper API key (https://serper.dev)

---

## 1. Configure environment

Add your key to `.env` in the repo root (the file already exists with model defaults filled in):

```
OPENAI_API_KEY=sk-...
COSTLY_MODEL=gpt-4o
CHEAP_MODEL=gpt-4o-mini
SERPER_API_KEY=...
```

`OPENAI_API_KEY`, `COSTLY_MODEL`, `CHEAP_MODEL`, and `SERPER_API_KEY` are required. If any is
missing or empty the backend logs the offending variable name and exits with a non-zero code
before accepting requests.

Search uses [Serper](https://serper.dev) (real Google results). Google dorks from the
DorkingAgent are sent as the `q` parameter **unchanged** (`site:`, `intitle:`, `inurl:`,
`after:`, quotes, etc.).

---

## 2. Run the backend

The virtualenv at `.venv/` already has the dependencies installed.

```powershell
cd D:\job_agent
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn main:app --reload --port 8000
```

If PowerShell blocks the activation script:
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

To install dependencies from scratch instead:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Run `uvicorn` from inside `backend/` — modules import as top-level packages (`config`,
`routers`, `services`, `job_agents`).

Backend runs at http://localhost:8000, interactive docs at http://localhost:8000/docs.

On startup the log line `Search: Serper` confirms the search backend.

---

## 3. Run the frontend

In a second terminal:

```powershell
cd D:\job_agent\frontend
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173 by default). Vite proxies `/api` to
`http://localhost:8000`, so no CORS setup is needed in development.

---

## 4. Use it

Drag a PDF or `.txt` resume onto the upload area (max 5 MB), then click **Find Jobs**. Progress
messages stream while the pipeline runs; results appear sorted by posted date, then by
alignment score.

Each signed-in user can upload `RESUME_UPLOAD_LIMIT` times per
`RESUME_UPLOAD_WINDOW_SECONDS` (defaults: 5 uploads per hour). Further uploads return HTTP 429.

---

## Tests

```powershell
cd D:\job_agent\backend
..\.venv\Scripts\python.exe -m pytest tests\ -v
```

Frontend type-check and production build:

```powershell
cd D:\job_agent\frontend
npm run build
```

---

## Project layout

```
backend/
  main.py             FastAPI app, startup validation
  config.py           Env var loading and validation
  routers/analyze.py  POST /api/analyze (SSE stream)
  services/           resume_parser, pipeline, deduplicator, serper, page_fetch
  job_agents/         dorking, search (3 tiers), validation
  models/schemas.py   Pydantic models
  tests/              SSE, parsing, and search tests
frontend/
  src/components/     FileUpload, ProgressIndicator, ResultsTable, JobCard, ErrorBanner
  src/hooks/          usePipelineStream
  src/api/client.ts   SSE fetch helper
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Required environment variable 'X' is missing or empty` | Fill `X` in `.env` |
| All three tiers report a search failure | Check `SERPER_API_KEY` and Serper credit balance |
| Frontend shows a connection error | Confirm the backend is running on port 8000 |
