# Implementation Plan: Resume Job Finder

## Overview

Implement the full-stack Resume Job Finder application: a FastAPI backend orchestrating a multi-agent pipeline (DorkingAgent → parallel SearchAgents → ValidationAgent) with a React/Vite frontend that streams progress and results via SSE. The backend is Python, the frontend is TypeScript/React.

---

## Tasks

- [x] 1. Project scaffolding
  - [x] 1.1 Create backend directory structure and install dependencies
    - Create `backend/` with subdirectories: `routers/`, `services/`, `agents/`, `models/`
    - Create `backend/requirements.txt` with pinned versions: `fastapi`, `uvicorn[standard]`, `python-multipart`, `pydantic`, `pdfplumber`, `PyMuPDF`, `openai-agents`, `python-dotenv`
    - Create `backend/main.py` with a minimal FastAPI app stub (no startup validation yet)
    - Create `.env.example` with all four required env vars as empty placeholders
    - _Requirements: 7.1, 8.1_

  - [x] 1.2 Create frontend directory structure with Vite + React + TypeScript
    - Scaffold `frontend/` using Vite with the `react-ts` template (`npm create vite@latest frontend -- --template react-ts`)
    - Add proxy config in `frontend/vite.config.ts` to forward `/api` to `http://localhost:8000`
    - Create the directory skeleton: `src/components/`, `src/hooks/`, `src/types/`, `src/api/`
    - _Requirements: 6.1, 6.2_

- [x] 2. Backend configuration and startup validation
  - [x] 2.1 Implement `backend/config.py` with env var loading and validation
    - Load `OPENAI_API_KEY`, `COSTLY_MODEL`, `CHEAP_MODEL`, `FETCH_MCP_URL` from environment using `python-dotenv`
    - Raise a descriptive `SystemExit` (non-zero) if any variable is missing or empty, logging the name of the offending variable
    - Expose a `settings` singleton consumed by all other modules
    - _Requirements: 7.1, 7.2, 8.1, 8.2_

  - [x] 2.2 Wire startup validation into `backend/main.py`
    - Import and invoke `settings` at module load so the process exits before accepting requests if config is invalid
    - Add a lifespan event that logs successful startup (without printing any secret values)
    - _Requirements: 7.2, 8.2, 8.3, 8.4_

- [x] 3. Pydantic data models
  - [x] 3.1 Implement all Pydantic schemas in `backend/models/schemas.py`
    - Define `JobResult`, `ValidatedJobResult`, `UnscoredJobResult`, `PipelineEvent`, `PipelineResponse` exactly as specified in the design document
    - `JobResult.posted_date` is `Optional[date]`; `alignment_score` is an `int` with a `Field(ge=0, le=100)` constraint; `justification` is a `str` with a `Field(max_length=600)` constraint (≈100 words)
    - `description` field has `Field(max_length=300)`
    - _Requirements: 3.6, 5.4, 5.5_

- [x] 4. Resume parser service
  - [x] 4.1 Implement `backend/services/resume_parser.py`
    - Implement `extract_text(file_bytes: bytes, filename: str) -> str`
    - For `.pdf` files: try `pdfplumber` first; fall back to `PyMuPDF` (`fitz`) if pdfplumber yields no text
    - For `.txt` files: decode as UTF-8 with `errors="replace"`
    - Raise `ValueError` for unsupported extensions
    - Return the stripped text; raise `ValueError("empty")` if the result is empty or only whitespace
    - _Requirements: 1.3, 1.5_

  - [ ]* 4.2 Write unit tests for resume parser
    - Test PDF extraction (mock pdfplumber), TXT extraction, empty PDF fallback, whitespace-only result, unsupported extension
    - _Requirements: 1.3, 1.5_

- [x] 5. DorkingAgent
  - [x] 5.1 Implement `backend/agents/dorking_agent.py`
    - Instantiate an OpenAI Agents SDK `Agent` using `settings.costly_model`
    - System prompt as specified in the design: expert job search strategist generating 5–15 Google dorking queries as a JSON array
    - Implement `async def generate_queries(resume_text: str) -> list[str]`
    - Parse the model JSON response; raise `ValueError` if the list has fewer than 5 entries
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Fetch MCP client integration
  - [x] 6.1 Implement the Fetch MCP client helper in `backend/agents/mcp_client.py`
    - Create `get_mcp_client() -> MCPClient` using `agents.mcp.MCPClient(url=settings.fetch_mcp_url)`
    - Return a singleton so all search agents share the same client connection
    - _Requirements: 3.5_

- [x] 7. Search agents
  - [x] 7.1 Implement `backend/agents/search_agents.py` with all three search agents
    - Create a shared `_build_search_agent(tier: str, system_prompt: str) -> Agent` factory that configures `CHEAP_MODEL` and attaches the Fetch MCP client
    - Implement `StartupSearchAgent`, `MidlevelSearchAgent`, `EnterpriseSearchAgent` with tier-specific system prompts as described in the design
    - Each agent's `async def search(queries: list[str]) -> list[JobResult]` method:
      - Injects the current date so the agent can compute the `after:` recency filter (30 days back)
      - Instructs the agent to return at most 50 `JobResult` JSON objects
      - Parses the response; skips individual results that fail Pydantic validation (log a warning)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Deduplication service
  - [x] 8.1 Implement `backend/services/deduplicator.py`
    - Implement `normalise_url(url: str) -> str`:
      - Lowercase scheme and host
      - Strip all query parameters
      - Remove trailing slash from path
    - Implement `deduplicate(results: list[JobResult]) -> list[JobResult]`:
      - Maintain `seen_urls: set[str]` of normalised URLs
      - First-encountered entry wins on URL collision
      - Entries with identical (case-insensitive) company name + job title but different normalised URLs are both retained
    - _Requirements: 4.1, 4.2_

  - [ ]* 8.2 Write property-based tests for deduplication
    - **Property 1: Idempotency** — `deduplicate(deduplicate(xs)) == deduplicate(xs)` for any list of `JobResult`
    - **Property 2: URL normalisation canonical form** — `normalise_url(normalise_url(u)) == normalise_url(u)` for any URL string
    - **Property 3: No URL duplicates in output** — the normalised URLs of all results returned by `deduplicate` are unique
    - **Validates: Requirements 4.1, 4.2**
    - Use `hypothesis` with `st.lists` and `st.text`/`st.from_regex` strategies
    - _Requirements: 4.1, 4.2_

- [x] 9. ValidationAgent
  - [x] 9.1 Implement `backend/agents/validation_agent.py`
    - Instantiate an OpenAI Agents SDK `Agent` using `settings.costly_model`
    - System prompt as specified in the design: senior recruiter scoring 0–100 with ≤100-word justification
    - Implement `async def validate(resume_text: str, jobs: list[JobResult]) -> tuple[list[ValidatedJobResult], list[UnscoredJobResult], list[str]]`
    - Handle partial failure: if the model response includes some valid entries and some invalid/missing, return the valid subset as `ValidatedJobResult` and the rest as `UnscoredJobResult` with a warning string
    - Handle total failure: catch exceptions and return all jobs as `UnscoredJobResult` with a warning string
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8_

- [x] 10. Pipeline orchestrator
  - [x] 10.1 Implement `backend/services/pipeline.py`
    - Implement `async def run_pipeline(resume_text: str, progress_cb: Callable[[str], Awaitable[None]]) -> PipelineResponse`
    - Step 1: call `DorkingAgent.generate_queries`; halt with error if fewer than 5 queries returned
    - Step 2: `asyncio.gather(startup_agent.search, midlevel_agent.search, enterprise_agent.search, return_exceptions=True)` with shared queries
    - Step 3: collect results and exceptions; record per-tier warnings for failed agents; halt if all three fail
    - Step 4: call `deduplicate`
    - Step 5: skip `ValidationAgent` if list is empty (return empty response); otherwise call `validate`
    - Step 6: sort `validated` by `(posted_date or date.min, alignment_score)` descending
    - Fire `progress_cb` at each step boundary
    - _Requirements: 3.1, 3.8, 3.9, 4.1, 5.1, 5.2, 5.6, 5.7, 5.8_

  - [ ]* 10.2 Write property-based tests for the sorting step
    - **Property 4: Sort stability for posted_date** — for any two results where `a.posted_date > b.posted_date`, `a` appears before `b` in the sorted output
    - **Property 5: Sort stability for alignment_score on equal dates** — for any two results with equal `posted_date`, the one with higher `alignment_score` appears first
    - **Property 6: None dates ranked last** — results with `posted_date = None` always appear after results with a non-None `posted_date`
    - **Validates: Requirements 5.6, 6.1**
    - Use `hypothesis` with `st.lists` of `ValidatedJobResult`-like dataclasses
    - _Requirements: 5.6, 6.1_

- [x] 11. Checkpoint — backend core complete
  - Ensure all tests pass. Verify that `python -m pytest backend/` runs without errors. Ask the user if any questions arise before proceeding.

- [x] 12. FastAPI SSE endpoint
  - [x] 12.1 Implement `backend/routers/analyze.py` with `POST /api/analyze`
    - Accept `multipart/form-data` with a single `file` field
    - Validate MIME type (`.pdf` / `.txt`) and file size (≤5 MB) before opening the stream; return `400` on violation
    - Use `StreamingResponse` with `media_type="text/event-stream"` and an async generator that:
      - Sends `event: progress` SSE frames as the pipeline fires `progress_cb`
      - Sends `event: warning` frames for each warning emitted
      - Sends `event: error` + closes stream on fatal errors
      - Sends `event: done` with the full `PipelineResponse` JSON as the final frame
    - Format each SSE frame as `event: {type}\ndata: {json}\n\n`
    - Register the router on the FastAPI app in `main.py` under prefix `/api`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.8, 5.7, 5.8, 6.3, 6.4_

- [x] 13. Frontend type definitions and API client
  - [x] 13.1 Create `frontend/src/types/index.ts` with all TypeScript interfaces
    - `JobResult`, `ValidatedJobResult`, `PipelineEventType`, `PipelineEvent` as defined in the design document
    - _Requirements: 6.1, 6.2_

  - [x] 13.2 Create `frontend/src/api/client.ts` with SSE fetch helper
    - Export `analyzeResume(file: File): AsyncGenerator<PipelineEvent>` using `fetch` + `ReadableStream` text decoding
    - Parse raw SSE frames (split on `\n\n`, extract `event:` and `data:` lines, JSON-parse `data`)
    - _Requirements: 6.3_

- [x] 14. `usePipelineStream` custom hook
  - [x] 14.1 Implement `frontend/src/hooks/usePipelineStream.ts`
    - State: `status: 'idle' | 'running' | 'done' | 'error'`, `progress: string`, `validated: ValidatedJobResult[]`, `unscored: JobResult[]`, `warnings: string[]`, `error: string | null`
    - Expose `startStream(file: File): void` that drives `analyzeResume`, dispatches state updates per event type, and sets `status` to `'done'` on the `done` event or `'error'` on the `error` event
    - Clean up the async generator on unmount
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 15. React UI components
  - [x] 15.1 Implement `frontend/src/components/FileUpload.tsx`
    - Drag-and-drop + click-to-browse; accepts `.pdf` and `.txt` (MIME + extension check)
    - Shows selected file name and size; "Find Jobs" button disabled until a valid file is selected
    - Calls `onSubmit(file)` prop when the button is clicked
    - Displays inline error if a non-PDF/TXT file is dropped
    - _Requirements: 1.1, 1.2_

  - [x] 15.2 Implement `frontend/src/components/ProgressIndicator.tsx`
    - Receives `message: string` prop; shows spinner + message while visible
    - _Requirements: 6.3_

  - [x] 15.3 Implement `frontend/src/components/JobCard.tsx`
    - Renders a single `ValidatedJobResult` or `UnscoredJobResult`
    - Tier badge: startup=green, midlevel=blue, enterprise=purple
    - Score badge with colour intensity proportional to score (hidden for unscored)
    - Posted date formatted as locale date string or "Date unknown"
    - Job URL opens in new tab with `rel="noopener noreferrer"`
    - _Requirements: 6.2_

  - [x] 15.4 Implement `frontend/src/components/ResultsTable.tsx`
    - Renders sorted `ValidatedJobResult[]` and optionally `UnscoredJobResult[]` as separate sections
    - Columns: Posted Date, Job Title, Company, Tier, Score, Justification, Link
    - Shows "No matching jobs found" message when both lists are empty
    - Renders `warnings` prop as a non-fatal warning banner above the table
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6_

  - [x] 15.5 Implement `frontend/src/components/ErrorBanner.tsx`
    - Receives `message: string` and `onDismiss: () => void` props
    - Dismissible via a close button
    - _Requirements: 6.4, 6.6_

- [x] 16. Wire everything together in `frontend/src/App.tsx`
  - [x] 16.1 Compose all components and the `usePipelineStream` hook in `App.tsx`
    - Render `FileUpload` initially; on submit call `startStream`
    - Show `ProgressIndicator` while `status === 'running'`
    - Show `ErrorBanner` when `status === 'error'`
    - Show `ResultsTable` when `status === 'done'`
    - Pass `warnings` from hook to `ResultsTable`
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 17. End-to-end integration and error handling polish
  - [x] 17.1 Add CORS middleware to the FastAPI app in `main.py`
    - Allow origin `http://localhost:3000` (development) so the Vite dev server can call the backend
    - _Requirements: (infrastructure)_

  - [x] 17.2 Verify end-to-end error paths are wired correctly
    - Confirm that `400` responses from `/api/analyze` are surfaced in `ErrorBanner` (the hook should detect non-2xx before reading the stream)
    - Confirm that `event: error` SSE frames set `status = 'error'` and populate `error` state
    - Confirm that per-tier search failures produce `event: warning` frames visible in the UI
    - Write integration tests using `pytest` + `httpx.AsyncClient` for the `/api/analyze` endpoint covering: invalid file type, oversized file, empty-text PDF, and a happy-path stub (mock agents)
    - _Requirements: 1.2, 1.4, 1.5, 3.8, 5.7, 5.8_

  - [x]* 17.3 Write integration tests for the SSE endpoint
    - Use `httpx.AsyncClient` with `TestClient` from FastAPI
    - Mock `run_pipeline` to emit controlled sequences of progress/warning/done/error events
    - Assert correct SSE frame format (`event:` + `data:` lines, double newline separator)
    - _Requirements: 1.4, 1.5, 3.8_

- [x] 18. Final checkpoint — full stack complete
  - Ensure all backend tests pass (`pytest backend/`). Ensure the frontend builds without TypeScript errors (`npm run build` in `frontend/`). Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests use the `hypothesis` library; add it to `requirements.txt`
- The Fetch MCP server must be running and reachable at `FETCH_MCP_URL` for search agents to work; mock it in tests
- Secret values must never appear in logs or HTTP responses (use `[REDACTED]` placeholder per Requirement 8.4)
- The frontend Vite proxy handles `/api` routing in development; no CORS issues when using `npm run dev`

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "4.1", "13.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "6.1", "13.2"] },
    { "id": 4, "tasks": ["7.1", "8.1", "9.1"] },
    { "id": 5, "tasks": ["8.2", "10.1", "14.1"] },
    { "id": 6, "tasks": ["10.2", "12.1", "15.1", "15.2", "15.3"] },
    { "id": 7, "tasks": ["15.4", "15.5", "16.1"] },
    { "id": 8, "tasks": ["17.1", "17.2"] },
    { "id": 9, "tasks": ["17.3"] }
  ]
}
```
