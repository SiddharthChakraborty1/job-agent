# Requirements Document

## Introduction

The Resume Job Finder is a web application that accepts a user's resume and autonomously searches for relevant job opportunities across different organization tiers. It uses a multi-agent pipeline: a dorking agent extracts targeted Google search queries from the resume, three parallel agents search for jobs at startups, mid-level organizations, and large companies respectively, and a final validation agent cross-references all results against the resume to surface the most relevant matches. The UI is built with React, the backend with FastAPI, the agent orchestration uses the OpenAI Agents SDK, and external web content is retrieved via the Fetch MCP.

## Glossary

- **System**: The Resume Job Finder application as a whole.
- **UI**: The React-based web interface through which users interact with the System.
- **Backend**: The FastAPI server that orchestrates agent execution and serves the UI.
- **Resume**: A user-uploaded document (PDF or plain text) containing professional history and skills.
- **Dorking_Agent**: The agent responsible for generating Google dorking queries derived from the Resume.
- **Google_Dorking_Query**: A structured search query using Google search operators (e.g., `site:`, `intitle:`, `inurl:`) designed to surface relevant job postings.
- **Search_Agent**: One of three parallel agents that searches the internet for job postings targeting a specific organization tier.
- **Startup_Search_Agent**: The Search_Agent that focuses on startup companies (typically seed to Series B).
- **Midlevel_Search_Agent**: The Search_Agent that focuses on mid-level organizations (typically Series C and beyond, non-enterprise).
- **Enterprise_Search_Agent**: The Search_Agent that focuses on large enterprises and well-known corporations.
- **Validation_Agent**: The final agent that reviews all collected job postings against the Resume and scores alignment.
- **Job_Result**: A structured record containing at minimum: job title, company name, job URL, organization tier, a brief description, and a posted date where available.
- **Posted_Date**: The date a job posting was published, extracted from the job posting page. May be absent if the page does not expose a publication date.
- **Validated_Job_Result**: A Job_Result enriched with an alignment score and a short justification produced by the Validation_Agent.
- **Fetch_MCP**: The Model Context Protocol server used to retrieve web page content from URLs during job search.
- **Costly_Model**: A high-capability OpenAI model (e.g., GPT-4o) used for tasks requiring deep reasoning.
- **Cheap_Model**: A lower-cost OpenAI model (e.g., GPT-4o-mini) used for tasks where cost efficiency is prioritised.
- **Pipeline**: The end-to-end sequence: Resume upload → Dorking_Agent → parallel Search_Agents → Validation_Agent → results display.

---

## Requirements

### Requirement 1: Resume Upload

**User Story:** As a job seeker, I want to upload my resume through a web interface, so that the System can analyse my profile and find relevant job opportunities.

#### Acceptance Criteria

1. THE UI SHALL provide a file upload control that accepts PDF and plain-text (.txt) files.
2. WHEN a user uploads a file that is not PDF or plain text, THE UI SHALL display an error message stating the accepted formats.
3. WHEN a file that has passed both format and size validation is uploaded, THE Backend SHALL extract the full text content of the Resume before passing it to the Pipeline.
4. IF the uploaded file exceeds 5 MB, THEN THE Backend SHALL reject the file and return an error message to the UI indicating the size limit.
5. IF text extraction from the uploaded Resume produces no content or only whitespace (e.g., an image-only PDF), THEN THE Backend SHALL return an error message to the UI indicating that text could not be extracted from the file.

---

### Requirement 2: Google Dorking Query Generation

**User Story:** As a job seeker, I want the System to generate targeted Google dorking queries from my resume, so that job searches are focused on my actual skills and experience.

#### Acceptance Criteria

1. WHEN a Resume is received by the Backend, THE Dorking_Agent SHALL generate a set of Google_Dorking_Queries derived from the skills, roles, and experience present in the Resume, where each query uses at least one Google search operator (e.g., `site:`, `intitle:`, `inurl:`).
2. THE Dorking_Agent SHALL use a Costly_Model for query generation.
3. THE Dorking_Agent SHALL produce between 5 and 15 Google_Dorking_Queries per Resume.
4. THE Dorking_Agent SHALL include at least one query targeting job title, at least one targeting key technical skills, and, when geographic or remote preference is inferable from the Resume, at least one query targeting that preference.
5. IF the Dorking_Agent produces fewer than 5 queries or produces no queries, THEN THE Backend SHALL halt the Pipeline and return an error message to the UI.

---

### Requirement 3: Parallel Job Search

**User Story:** As a job seeker, I want the System to search for jobs across startups, mid-level organisations, and large companies simultaneously, so that I receive a broad set of opportunities quickly.

#### Acceptance Criteria

1. WHEN the Dorking_Agent has produced Google_Dorking_Queries, THE Backend SHALL launch the Startup_Search_Agent, Midlevel_Search_Agent, and Enterprise_Search_Agent concurrently.
2. THE Startup_Search_Agent SHALL use a Cheap_Model and SHALL search for job postings at startup companies using the provided Google_Dorking_Queries.
3. THE Midlevel_Search_Agent SHALL use a Cheap_Model and SHALL search for job postings at mid-level organisations using the provided Google_Dorking_Queries.
4. THE Enterprise_Search_Agent SHALL use a Cheap_Model and SHALL search for job postings at large enterprise companies using the provided Google_Dorking_Queries.
5. EACH Search_Agent SHALL use the Fetch_MCP to retrieve and parse web page content from candidate job posting URLs; IF the Fetch_MCP call for a specific URL fails, THEN THE Search_Agent SHALL skip that URL and continue processing remaining URLs.
6. EACH Search_Agent SHALL return a list of at most 50 Job_Results, where each Job_Result contains job title, company name, job URL, organisation tier, a brief description of no more than 300 characters, and a Posted_Date where the posting page exposes one.
7. EACH Search_Agent SHALL prefer the most recently posted job listings; WHERE a Google_Dorking_Query supports a recency filter (e.g., `after:` operator or search engine date range), THE Search_Agent SHALL apply that filter to surface postings from the last 30 days.
8. IF a Search_Agent terminates unexpectedly or all of its URL fetches fail, THEN THE Backend SHALL record the failure, continue with results from the remaining Search_Agents, and surface a warning message to the UI identifying which tier's search failed.
9. WHEN all Search_Agents have completed, THE Backend SHALL aggregate their Job_Results into a single deduplicated list before passing it to the Validation_Agent.

---

### Requirement 4: Job Result Deduplication

**User Story:** As a job seeker, I want duplicate job postings removed from my results, so that I do not review the same listing multiple times.

#### Acceptance Criteria

1. WHEN aggregating Job_Results from all Search_Agents, THE Backend SHALL deduplicate entries by normalised job URL, where normalisation converts the scheme to lowercase, converts the host to lowercase, removes any trailing slash, and strips all query parameters; when duplicates are found, THE Backend SHALL retain the first-encountered entry.
2. IF two Job_Results share the same company name and job title (compared case-insensitively) but have different normalised URLs, THEN THE Backend SHALL retain both entries.

---

### Requirement 5: Job Validation and Alignment Scoring

**User Story:** As a job seeker, I want a final review agent to score how well each job matches my resume, so that I can prioritise the most relevant opportunities.

#### Acceptance Criteria

1. WHEN the aggregated Job_Result list is available and contains at least one entry, THE Validation_Agent SHALL evaluate each Job_Result against the Resume and produce a Validated_Job_Result.
2. IF the aggregated Job_Result list is empty, THEN THE Backend SHALL return an empty result set to the UI without invoking the Validation_Agent.
3. THE Validation_Agent SHALL use a Costly_Model for evaluation.
4. THE Validation_Agent SHALL assign each Validated_Job_Result an alignment score as a whole-number integer on a scale of 0 to 100.
5. THE Validation_Agent SHALL include a justification of no more than 100 words per Validated_Job_Result explaining the assigned score.
6. WHEN the Validation_Agent has processed all Job_Results, THE Backend SHALL sort Validated_Job_Results first by Posted_Date descending (most recent first, entries with no Posted_Date ranked last), then by alignment score descending as a secondary sort, before returning them to the UI.
7. IF the Validation_Agent fails entirely before producing any results, THEN THE Backend SHALL return the unscored Job_Results to the UI along with a warning that validation was unavailable.
8. IF the Validation_Agent produces results for some but not all Job_Results before failing, THEN THE Backend SHALL return the scored subset and the unscored remainder to the UI, clearly labelling each group.

---

### Requirement 6: Results Display

**User Story:** As a job seeker, I want to see the validated job results in a clear, readable format, so that I can quickly review and act on the best matches.

#### Acceptance Criteria

1. THE UI SHALL display Validated_Job_Results in a list sorted first by Posted_Date descending (most recent first), then by alignment score descending for equal or absent dates.
2. THE UI SHALL show, for each Validated_Job_Result, the job title, company name, organisation tier, alignment score as an integer between 0 and 100, justification, Posted_Date (displayed as a human-readable date, or "Date unknown" if absent), and a link to the job URL that navigates to the job posting when activated.
3. WHILE the Pipeline is running, THE UI SHALL display a progress indicator informing the user that processing is in progress.
4. WHEN the Pipeline completes, THE UI SHALL hide the progress indicator and render the results list regardless of whether results are present.
5. IF no Validated_Job_Results are returned, THEN THE UI SHALL display a message informing the user that no matching jobs were found.
6. IF the Backend returns unscored Job_Results with a validation warning (per Requirement 5, Criteria 7–8), THEN THE UI SHALL display the warning message and render the available results without score or justification fields.

---

### Requirement 7: Model Configuration

**User Story:** As an operator, I want to configure which OpenAI models are used for each agent, so that I can balance cost and quality without modifying application code.

#### Acceptance Criteria

1. WHEN the Backend starts, THE Backend SHALL read the Costly_Model identifier from the `COSTLY_MODEL` environment variable and the Cheap_Model identifier from the `CHEAP_MODEL` environment variable.
2. IF the `COSTLY_MODEL` or `CHEAP_MODEL` environment variable is not set or is an empty string at startup, THEN THE Backend SHALL log an error message identifying the missing or empty variable by name and terminate with a non-zero exit code without accepting any requests.
3. THE Dorking_Agent and Validation_Agent SHALL use the Costly_Model identifier for every API call made to the model provider.
4. THE Startup_Search_Agent, Midlevel_Search_Agent, and Enterprise_Search_Agent SHALL use the Cheap_Model identifier for every API call made to the model provider.

---

### Requirement 8: API Key and Secrets Management

**User Story:** As an operator, I want all API keys and secrets managed through environment variables, so that credentials are never hard-coded in the application source.

#### Acceptance Criteria

1. THE Backend SHALL read the OpenAI API key exclusively from the `OPENAI_API_KEY` environment variable.
2. IF the `OPENAI_API_KEY` environment variable is not set or is an empty string at startup, THEN THE Backend SHALL log an error message identifying the missing variable by name, terminate with a non-zero exit code, and not accept any requests.
3. THE System SHALL never include secret values (API key values or any other credential values) in log output, error messages, HTTP responses, or source code.
4. WHEN producing any observable output (logs, error messages, HTTP responses), THE System SHALL redact any secret value that would otherwise appear, replacing it with a fixed placeholder such as `[REDACTED]`.
