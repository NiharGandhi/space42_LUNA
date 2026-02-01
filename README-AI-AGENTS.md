# Space42 AI Agents – Overview

This document describes all AI agents in the Space42 HR platform: what they do, which tools they use, how we reduce hallucination, how they are prompted, and what security measures are in place.

---

## 1. All AI Agents

| Agent | Purpose | Where Used |
|-------|---------|------------|
| **HR Agent** | HR assistant with full access to candidates, applications, jobs, and onboarding. Answers questions and performs actions (create jobs, mark hired, list flows). | `/api/hr/chat` (HR dashboard chat) |
| **Candidate Agent** | Hiring assistant on the career site. Guides candidates through applying: resume first, parse resume, search jobs, get job details, submit application. | `/api/chat` (career portal chatbot) |
| **Onboarding Agent** | Chat assistant for new hires (offer → joining). Answers questions about visa, background check, IT setup, documents, handbook, and their task list. | `/api/onboarding/chat` |
| **VAPI Interview Assistant** | Voice agent for Stage 3 interviews. Asks 3–4 role-specific questions, then ends the call. No database access. | VAPI webhook `/api/webhooks/vapi` |
| **Onboarding Flow Generator** | One-shot AI: given HR prompt + company context/docs/URLs, returns a suggested list of onboarding tasks (JSON). Not a chat agent. | `/api/hr/onboarding-templates/generate` |
| **Resume Parser / Stage 1 Evaluator** | Extracts structured data from resume text and (optionally) scores it against a job (skills, experience, education matrix). Used by Candidate Agent (`parse_resume`) and by Stage 1 screening. | `lib/ai/resume-parser.ts`, `lib/screening/stage1.ts` |
| **Stage 2 Questions Generator** | One-shot: suggests 3–5 screening questions for a job from job context + optional HR input. | Used when HR configures Stage 2 for a job |

---

## 2. Tools Each Agent Can Access

### HR Agent

**Tools (function calling):** The HR agent can **only** act through these tools; all data comes from the database or from tool results.

| Tool | Description |
|------|-------------|
| `get_dashboard_stats` | Open roles, total jobs, applications count, hired count, offers extended, applicants in last 7 days |
| `list_jobs` | List jobs; optional filters: status, department, location |
| `get_job_details` | Full job by ID (title, department, location, description, requirements, responsibilities, status, salary) |
| `create_job` | Create job (title, department, location, employmentType, description, requirements, responsibilities, optional salary/status) |
| `update_job_status` | Set job status: draft, active, paused, closed |
| `list_applications` | List applications with job/candidate info; optional filters: jobId, status, limit |
| `get_application_details` | Full application: candidate, job, status, resume summary, all screening stages (1/2/3) |
| `list_candidates` | List candidates (users with ≥1 application); optional search by name/email |
| `get_candidate_details` | Candidate by ID: profile + applications with job titles and statuses |
| `mark_as_hired` | Mark application as hired (only if status = stage3_passed); creates onboarding flow, notifies candidate |
| `list_onboarding_templates` | List templates with task counts |
| `get_onboarding_template` | One template with its tasks (title, category, order) |
| `list_onboarding_flows` | List onboarding flows for hired applications; optional status filter |
| `get_onboarding_flow` | Onboarding flow and tasks for a given application (hired only) |

**No other tools.** The agent cannot read/write anything outside these.

---

### Candidate Agent

**Tools (function calling):** All candidate-facing data and actions go through these tools.

| Tool | Description |
|------|-------------|
| `parse_resume` | Parse resume text into structured JSON (name, email, skills, experience, etc.) and optionally score against a job; returns `missingOrUnclear` so the agent only asks for missing fields |
| `search_jobs` | Search active jobs; optional filters: department, location. Call with no args to get all active jobs |
| `get_job_details` | Full job details by job ID (for requirements, responsibilities, description) |
| `create_application` | Submit application: jobId, candidateData (from parsed resume + chat), optional resumeText |

**No access** to other applications, HR-only data, or admin actions.

---

### Onboarding Agent

**No tools.** It is a single completion with a **system prompt** built from:

- Company context (name, about, handbook, policies, culture, visa/background-check/IT/ID instructions)
- Uploaded company documents (extracted text, capped)
- Content from company URLs
- Department contacts
- New hire’s name, role, department
- Their onboarding task list (title, description, status, category)

The model is instructed to use only this context and to say “I don’t have that information” when something isn’t in the provided data.

---

### VAPI Interview Assistant

**Tools:** Only `endCall`. No database or internal APIs. It uses:

- System message: job title, short job description, instructions to ask 3–4 questions and then end the call
- `endCallPhrases` so the call ends when the assistant says the interview is complete

Evaluation and storage happen in the VAPI webhook (e.g. end-of-call report), not via extra tools.

---

### Onboarding Flow Generator

**No chat tools.** Single request: system prompt (company context + docs + URLs + existing tasks) + user prompt (HR’s instructions). Response is parsed as a JSON array of tasks. No ongoing conversation.

---

### Resume Parser / Stage 1

Used in two ways:

1. **Candidate Agent** – `parse_resume` tool calls `parseResumeWithAI` (and optionally job-match). Returns structured parsed resume + optional job match.
2. **Stage 1 screening** – `evaluateResumeMatrix` returns dimension scores (skills, experience, education) and rationales; then we compute overall score and pass/fail. No “tools” in the OpenAI sense; we use **structured outputs** (response schema) so the model returns fixed shapes.

---

## 3. How We Reduce Hallucination

### 3.1 Prompt rules

- **HR screening / evaluation (prompts and in-code):**  
  “Never fabricate information”, “If data is insufficient, say so clearly”, “Always explain reasoning.”
- **Onboarding Agent:**  
  “Do not make up details—only use what's provided.” If the answer isn’t in company context, docs, or tasks, it must say so and suggest asking HR.
- **Candidate Agent:**  
  Instructed not to invent job details; must call `get_job_details` for requirements/description. Must use `parse_resume` result and only ask for `missingOrUnclear` fields.

### 3.2 Data only from tools or injected context

- **HR Agent:** All facts (candidates, applications, jobs, onboarding) come from tool results. The model cannot “know” anything that wasn’t returned by a tool call.
- **Candidate Agent:** Job list and job details come from `search_jobs` and `get_job_details`. Candidate data comes from `parse_resume` and user messages. Application submission is via `create_application` only.
- **Onboarding Agent:** All knowledge is in the system prompt (company context, docs, URLs, tasks). No tools, so no opportunity to “guess” from nowhere.

### 3.3 Structured output

- **Resume parser:** Uses OpenAI structured output (strict schema) for parsed resume and for job-match result (scores, skills match, gaps).
- **Stage 1 evaluation:** Uses an evaluation-matrix schema (dimension scores 0–10, rationales, skills/experience match, gaps, summary). Reduces free-form fabrication.
- **Stage 2 questions generator:** Returns a JSON object with a `questions` array (questionText, isRequired).
- **Onboarding flow generator:** Output is a JSON array of tasks; we parse and validate category/fields.

### 3.4 Bounded, explainable evaluations

- Stage 1: Scores and rationales are per dimension (skills, experience, education); passing threshold is configurable. Rationales are stored so HR can see why a score was given.
- HR and Candidate agents are instructed to be concise and, where relevant, to explain or point to data (e.g. “based on the application details…”).

---

## 4. How We Prompt the Agents

### 4.1 Where prompts live

| Agent / Component | Prompt location |
|-------------------|-----------------|
| HR Agent (chat) | `lib/ai/agents/hr-agent.ts` – `hrAgentSystemPrompt` (in code). High-level screening/evaluation behavior is also described in `prompts/HR Screening & Interview Agent.txt`. |
| Candidate Agent | `lib/ai/agents/candidate-agent.ts` – `candidateAgentSystemPrompt` (in code). Aligned with `prompts/Candidate AI Chatbot Prompt.txt`. |
| Onboarding Agent | `lib/ai/agents/onboarding-agent.ts` – `buildOnboardingAgentSystemPrompt()` builds one prompt from company context, docs, URLs, contacts, pre-joining instructions, new hire role, and task list. |
| VAPI Interview | `lib/vapi/interview-assistant.ts` – `buildInterviewAssistantDto()`; system content is inline (job title, job description slice, rules: ask 3–4 questions, no emotion/appearance analysis, then end call). |
| Resume parser | `lib/ai/resume-parser.ts` – `PARSE_SYSTEM`, `JOB_MATCH_SYSTEM`, and evaluation-matrix system prompt; all inline. |
| Stage 2 questions | `lib/ai/stage2-questions-generator.ts` – system prompt inside `suggestStage2Questions()`. |
| Onboarding flow generator | `lib/ai/agents/onboarding-flow-generator.ts` – `buildSystemPrompt()`: company context, docs, URLs, existing tasks, plus instructions to output only a JSON array of tasks. |

### 4.2 Prompting patterns

- **Role and boundaries:** Every agent has a clear role (“HR assistant”, “hiring assistant for candidates”, “onboarding assistant”) and explicit “do not” rules (e.g. do not make hiring decisions, do not analyze emotions in interviews).
- **Structured output when needed:** Resume parser, Stage 1 matrix, Stage 2 questions, and onboarding flow generator all request JSON with a defined shape (and, where supported, use OpenAI response schema).
- **Context injection:** Onboarding gets a single system prompt with all relevant context. HR and Candidate agents get context via tool results and (for Candidate) optional `jobId` in the system message.
- **Formatting and links:** HR and Candidate prompts ask for readable formatting (bold, lists) and in-app links (e.g. `/jobs/<id>`, `/applications/<id>`) so users can click through.

---

## 5. Security Features

### 5.1 Authentication and authorization

- **Session-based auth:** `getSessionUser()` (cookies) and `validateSessionToken(token)` for API routes. Sessions stored in DB with expiry.
- **HR chat (`/api/hr/chat`):** Requires authenticated user; **only `role === 'hr'` or `role === 'admin'`** can use the HR agent. Others get 403.
- **Onboarding chat (`/api/onboarding/chat`):** Requires authenticated user. User must have an application with **status = `hired`** and an existing onboarding flow. Otherwise 403/404.
- **Candidate chat (`/api/chat`):** Can be used authenticated or unauthenticated. Submitting an application (`create_application`) requires auth; if not logged in, the agent tells the user to sign in and try again.

### 5.2 Tool execution and scoping

- **HR Agent:** Every tool is executed with `hrUserId`. Create/update operations (e.g. `create_job`, `mark_as_hired`) are tied to that user. The agent cannot act on behalf of another user.
- **Candidate Agent:** `create_application` is only successful when the session user exists; `userId` is passed into `executeAgentTool`. Resume context (e.g. `resumeText`) is passed from the request, not from arbitrary user input in tool args beyond what the tool expects.
- **ID validation:** HR and Candidate agents’ tools validate IDs (e.g. `jobId`, `applicationId`, `candidateId`) with **UUID format** (`isUUID()`). Invalid IDs return clear errors and do not hit the DB with malformed values.

### 5.3 Input validation

- **OTP verification:** Request body validated with Zod (email, 6-digit code).
- **HR tool args:** Required/optional fields and enums (e.g. job status, employment type) are validated inside each tool implementation; invalid input returns JSON error messages instead of performing the action.
- **Onboarding flow generator:** HR endpoint that generates templates is used in an HR-only context (dashboard); prompt and existing tasks are passed in and length/caps are applied in `buildSystemPrompt`.

### 5.4 Safe defaults and caps

- **Onboarding Agent:** Company docs and URL content are truncated (e.g. `MAX_DOCS_CHARS`, `MAX_URLS_CHARS`) to avoid token overflow and to keep context relevant.
- **Resume parser / Stage 1:** Job description and resume text are length-bounded where used in prompts.
- **VAPI:** `maxDurationSeconds` and `endCallPhrases` limit call length and ensure the assistant can end the call predictably.

### 5.5 Error handling

- HR chat route catches DB/network errors and returns 503 with a generic “service temporarily unavailable” message instead of leaking internal details.
- Tool errors (e.g. “Job not found”, “Valid jobId required”) are returned as JSON strings to the model so it can respond appropriately to the user without exposing internals.

---

## 6. Quick reference: agents and entrypoints

| Agent | API / Entrypoint | Auth / Role |
|-------|------------------|-------------|
| HR Agent | `POST /api/hr/chat` | Session; role `hr` or `admin` |
| Candidate Agent | `POST /api/chat` | Optional session; required for `create_application` |
| Onboarding Agent | `POST /api/onboarding/chat` | Session; user must be hired and have onboarding flow |
| VAPI Interview | VAPI → `POST /api/webhooks/vapi` | Validated by VAPI + your webhook logic |
| Onboarding Flow Generator | `POST /api/hr/onboarding-templates/generate` | HR dashboard (HR-only in practice) |
| Resume Parser / Stage 1 | Used by Candidate agent + `lib/screening/stage1.ts` | Same as Candidate agent + internal screening |
| Stage 2 Questions | Used when configuring Stage 2 | HR context |

For implementation details, see the files under `lib/ai/agents/`, `lib/ai/resume-parser.ts`, `lib/ai/stage2-questions-generator.ts`, and `lib/vapi/interview-assistant.ts`.
