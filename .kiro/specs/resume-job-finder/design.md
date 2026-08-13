# Design Document

## Overview

Resume Job Finder is a full-stack web application. A React SPA serves as the frontend, communicating with a FastAPI backend over HTTP REST and Server-Sent Events (SSE). The backend orchestrates a multi-agent pipeline using the OpenAI Agents SDK: a Dorking Agent generates Google search queries from the uploaded resume, three parallel Search Agents retrieve recent job postings across startup, mid-level, and enterprise tiers using the Fetch MCP, and a Validation Agent scores each result against the resume. Results are sorted by recency then alignment score and streamed back to the UI.

---

## Architecture

```
┌─────────────────────────────────┐
│         React SPA (port 3000)   │
│  FileUpload → ProgressStream    │
│  → ResultsTable                 │
└────────────┬────────────────────┘
             │ HTTP / SSE
┌────────────▼────────────────────┐
│       FastAPI Backend           │
│  POST /api/analyze (SSE stream) │
│  POST /api/upload (validation)  │
│                                 │
│  ┌──────────────────────────┐   │
│  │    Pipeline Orchestrator │   │
│  │  1. ResumeParser         │   │
│  │  2. DorkingAgent         │   │
│  │  3. asyncio.gather(      │   │
│  │       StartupAgent,      │   │
│  │       MidlevelAgent,     │   │
│  │       EnterpriseAgent)   │   │
│  │  4. Deduplicator         │   │
│  │  5. ValidationAgent      │   │
│  │  6. Sorter               │   │
│  └──────────────────────────┘   │
└────────────┬────────────────────┘
             │ OpenAI Agents SDK
┌────────────▼────────────────────┐
│     OpenAI API (models)         │
│  Costly: gpt-4o                 │
│  Cheap:  gpt-4o-mini            │
└─────────────────────────────────┘
             │ Fetch MCP
┌────────────▼────────────────────┐
│     External Web Pages          │
│  (job posting URLs)             │
└─────────────────────────────────┘
```

---

## Project Structure

```
resume-job-finder/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   ├── ResultsTable.tsx
│   │   │   ├── JobCard.tsx
│   │   │   └── ErrorBanner.tsx
│   │   ├── hooks/
│   │   │   └── usePipelineStream.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # FastAPI app
│   ├── main.py                  # App entry point, startup validation
│   ├── config.py                # Env var loading
│   ├── routers/
│   │   └── analyze.py           # POST /api/analyze (SSE)
│   ├── services/
│   │   ├── resume_parser.py     # PDF + TXT extraction
│   │   ├── pipeline.py          # Orchestrator (asyncio)
│   │   └── deduplicator.py      # URL normalisation + dedup
│   ├── agents/
│   │   ├── dorking_agent.py
│   │   ├── search_agents.py     # Startup / Midlevel / Enterprise
│   │   └── validation_agent.py
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   └── requirements.txt
│
└── .env.example
```

---

## Data Models

### Backend (Pydantic)

```python
from pydantic import BaseModel
from typing import Optional
from datetime import date

class JobResult(BaseModel):
    job_title: str
    company_name: str
    job_url: str
    organisation_tier: str          # "startup" | "midlevel" | "enterprise"
    description: str                # max 300 chars
    posted_date: Optional[date]     # None if not extractable

class ValidatedJobResult(JobResult):
    alignment_score: int            # 0–100 integer
    justification: str              # max 100 words

class UnscoredJobResult(JobResult):
    pass

class PipelineEvent(BaseModel):
    event: str                      # "progress" | "result" | "warning" | "error" | "done"
    message: Optional[str]
    data: Optional[dict]

class PipelineResponse(BaseModel):
    validated: list[ValidatedJobResult]
    unscored: list[UnscoredJobResult]
    warnings: list[str]
```

### Frontend (TypeScript)

```typescript
export interface JobResult {
  job_title: string;
  company_name: string;
  job_url: string;
  organisation_tier: 'startup' | 'midlevel' | 'enterprise';
  description: string;
  posted_date: string | null;       // ISO date string or null
}

export interface ValidatedJobResult extends JobResult {
  alignment_score: number;          // 0–100
  justification: string;
}

export type PipelineEventType = 'progress' | 'result' | 'warning' | 'error' | 'done';

export interface PipelineEvent {
  event: PipelineEventType;
  message?: string;
  data?: unknown;
}
```

---

## API Contract

### `POST /api/analyze`

Accepts the resume file as `multipart/form-data` and returns a Server-Sent Events stream.

**Request**
```
Content-Type: multipart/form-data
Body: file (PDF or .txt, max 5 MB)
```

**SSE Event stream**
```
event: progress
data: {"message": "Extracting resume text..."}

event: progress
data: {"message": "Generating dorking queries..."}

event: progress
data: {"message": "Searching startups, mid-level orgs, and enterprises in parallel..."}

event: progress
data: {"message": "Validating and scoring results..."}

event: warning
data: {"message": "Enterprise search failed: timeout"}

event: done
data: {
  "validated": [ ...ValidatedJobResult[] ],
  "unscored":  [ ...UnscoredJobResult[] ],
  "warnings":  [ ...string[] ]
}

# On fatal error:
event: error
data: {"message": "Could not extract text from the uploaded file."}
```

**HTTP error responses (before stream opens)**
- `400` — unsupported file type or file exceeds 5 MB
- `500` — unexpected server error

---

## Agent Design

### DorkingAgent

| Property | Value |
|---|---|
| Model | `COSTLY_MODEL` env var |
| Tools | None (pure reasoning) |
| Input | Resume plain text |
| Output | JSON array of 5–15 Google dorking query strings |

**System prompt excerpt:** "You are an expert job search strategist. Given a resume, produce 5 to 15 Google dorking queries using operators such as `site:`, `intitle:`, `inurl:`, and `after:`. Include queries targeting job title, key technical skills, and location/remote preference if inferable. Each query must use at least one Google search operator. Return only a JSON array of strings."

---

### Search Agents (Startup / Midlevel / Enterprise)

Each agent is instantiated with a tier-specific system prompt but shares the same structure.

| Property | Value |
|---|---|
| Model | `CHEAP_MODEL` env var |
| Tools | `fetch_page` (via Fetch MCP) |
| Input | Dorking queries + tier instruction |
| Output | JSON array of `JobResult` objects (max 50) |

**Fetch MCP tool**: `fetch_page(url: str) -> str` — retrieves and returns the text content of a web page. The agent uses this to open candidate job posting URLs found via search queries and extract title, company, description, and posted date.

**Recency strategy**: Queries include `after:YYYY-MM-DD` operator set to 30 days before the current date. Agents are instructed to prioritise results with a `posted_date` and to prefer listings posted within the last 30 days.

**Tier-specific instructions:**
- Startup: "Focus on companies at seed to Series B stage. Look on AngelList, Wellfound, YC job boards."
- Midlevel: "Focus on companies at Series C and beyond but not household-name enterprises. Look on LinkedIn, Greenhouse, Lever."
- Enterprise: "Focus on large, well-known corporations. Look on their official careers pages, LinkedIn, Indeed."

---

### ValidationAgent

| Property | Value |
|---|---|
| Model | `COSTLY_MODEL` env var |
| Tools | None |
| Input | Resume plain text + list of JobResult JSON objects |
| Output | JSON array of `ValidatedJobResult` objects |

**System prompt excerpt:** "You are a senior recruiter. For each job result provided, compare the job requirements against the candidate's resume and assign an integer alignment score from 0 to 100. Include a justification of no more than 100 words. Return a JSON array."

---

## Pipeline Orchestration (`pipeline.py`)

```python
async def run_pipeline(resume_text: str, progress_cb) -> PipelineResponse:
    # 1. Generate dorking queries
    await progress_cb("Generating dorking queries...")
    queries = await dorking_agent.run(resume_text)

    # 2. Run 3 search agents concurrently
    await progress_cb("Searching across startup, mid-level, and enterprise tiers...")
    results = await asyncio.gather(
        startup_agent.run(queries),
        midlevel_agent.run(queries),
        enterprise_agent.run(queries),
        return_exceptions=True
    )

    # 3. Handle partial failures, collect Job_Results
    job_results, warnings = collect_results(results)

    # 4. Deduplicate
    job_results = deduplicate(job_results)

    # 5. Validate
    await progress_cb("Validating and scoring results...")
    validated, unscored, val_warnings = await validation_agent.run(resume_text, job_results)
    warnings.extend(val_warnings)

    # 6. Sort: posted_date desc, then alignment_score desc
    validated.sort(key=lambda r: (r.posted_date or date.min, r.alignment_score), reverse=True)

    return PipelineResponse(validated=validated, unscored=unscored, warnings=warnings)
```

---

## Deduplication (`deduplicator.py`)

URL normalisation rules:
1. Lowercase scheme and host
2. Remove trailing slash from path
3. Strip all query parameters

Dedup logic: maintain a `seen_urls: set[str]` of normalised URLs. First-encountered entry wins. Entries with the same company name + job title (case-insensitive) but different normalised URLs are both retained.

---

## Frontend Components

### `FileUpload.tsx`
- Drag-and-drop + click-to-browse file input
- Accepts `.pdf` and `.txt` only (MIME type + extension check client-side)
- Displays file name and size after selection
- "Find Jobs" submit button triggers the SSE stream

### `ProgressIndicator.tsx`
- Shown while stream is open
- Displays the latest `progress` event message
- Spinner animation

### `ResultsTable.tsx`
- Renders sorted `ValidatedJobResult[]` and optionally `UnscoredJobResult[]`
- Columns: Posted Date, Job Title, Company, Tier, Score, Justification, Link
- Warning banner at top if `warnings.length > 0`

### `JobCard.tsx`
- Individual result row / card
- Tier badge (colour-coded: startup=green, midlevel=blue, enterprise=purple)
- Score badge (colour intensity scales with score)
- Posted date shown as formatted date or "Date unknown"
- Job URL opens in new tab

### `ErrorBanner.tsx`
- Displays fatal pipeline error messages
- Dismissible

### `usePipelineStream.ts` (custom hook)
- Opens `EventSource` to `/api/analyze` via `fetch` + `ReadableStream` (SSE)
- Manages state: `status`, `progress`, `results`, `warnings`, `error`
- Handles reconnection and stream close

---

## Environment Variables

| Variable | Required | Used by | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | Backend | OpenAI API authentication |
| `COSTLY_MODEL` | Yes | Backend | Model ID for DorkingAgent and ValidationAgent (e.g. `gpt-4o`) |
| `CHEAP_MODEL` | Yes | Backend | Model ID for Search Agents (e.g. `gpt-4o-mini`) |
| `FETCH_MCP_URL` | Yes | Backend | URL of the running Fetch MCP server |

Backend validates all four on startup and exits with a non-zero code if any are missing or empty.

---

## Error Handling Strategy

| Scenario | Behaviour |
|---|---|
| Invalid file type | `400` before stream opens |
| File > 5 MB | `400` before stream opens |
| Empty/whitespace extracted text | `error` SSE event, pipeline halts |
| Dorking agent produces < 5 queries | `error` SSE event, pipeline halts |
| Single Search Agent fails | `warning` SSE event, pipeline continues with remaining agents |
| All 3 Search Agents fail | `error` SSE event, pipeline halts |
| ValidationAgent fails entirely | `warning` SSE event, unscored results returned |
| ValidationAgent fails partially | `warning` SSE event, scored + unscored groups returned |
| Fetch MCP call for a single URL fails | Search Agent skips URL, continues |

---

## MCP Configuration

The Fetch MCP server is run as a sidecar process (e.g. `mcp-server-fetch`). The backend connects to it via the URL specified in `FETCH_MCP_URL`. Each Search Agent is initialised with an MCP client that exposes a single `fetch_page` tool.

```python
from agents.mcp import MCPClient

mcp_client = MCPClient(url=settings.fetch_mcp_url)
# Passed to each Search Agent at instantiation
```
