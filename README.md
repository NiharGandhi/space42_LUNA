# Space42

**AI-powered HR platform for hiring and onboarding.**  
Career portal with an AI chatbot, multi-stage screening (resume → written Q&A → voice interview), HR dashboard with an AI assistant, and smart onboarding for new hires.

---

## Demo

### Screen recordings

| Demo | Description |
|------|-------------|
| [Career portal & AI chat](screenshots/Screen%20Recording%202026-02-01%20at%201.39.40%20PM.mov) | Candidate experience: browse jobs, chat with the AI assistant, apply with resume. |
| [HR dashboard & screening](screenshots/Screen%20Recording%202026-02-01%20at%201.41.56%20PM.mov) | HR workflow: dashboard, AI agent, applications, and screening stages. |

### Screenshots

| | | |
|:---------------------------:|:---------------------------:|:---------------------------:|
| ![Career portal](screenshots/Screenshot%202026-02-01%20at%201.40.53%20PM.png) | ![Application flow](screenshots/Screenshot%202026-02-01%20at%201.45.06%20PM.png) | ![HR view](screenshots/Screenshot%202026-02-01%20at%201.55.10%20PM.png) |
| *Career portal* | *Application flow* | *HR dashboard* |
| ![Screening](screenshots/Screenshot%202026-02-01%20at%201.55.22%20PM.png) | ![Application detail](screenshots/Screenshot%202026-02-01%20at%201.55.29%20PM.png) | ![Stages](screenshots/Screenshot%202026-02-01%20at%201.55.35%20PM.png) |
| *Screening stages* | *Application detail* | *Pipeline view* |
| ![Onboarding](screenshots/Screenshot%202026-02-01%20at%201.55.40%20PM.png) | | |
| *Onboarding* | | |

---

## Features

### For candidates

- **Career portal** — Browse active jobs by department/location with smart, partial matching (e.g. “software developer”, “cyber”).
- **AI hiring assistant** — Chat to explore roles, paste or upload a resume, get guided through one application flow; resume is parsed and only missing info is asked.
- **Application pipeline** — Apply → Stage 1 (resume screening) → Stage 2 (written Q&A) → Stage 3 (voice AI interview). Track status and outcomes in one place.
- **My applications** — View all applications, stage results, and next steps.
- **Onboarding (hired)** — Checklist, company context, and an AI onboarding assistant for visa, IT, documents, and handbook.

### For HR

- **HR dashboard** — Overview of open roles, applications, hired count, and recent applicants.
- **AI HR agent** — Chat to query candidates, applications, and jobs; create jobs, update status, mark hired, and manage onboarding templates and flows. Tool-calling only (no free-form system injection).
- **Jobs** — Create, edit, publish, and close job postings; set requirements, responsibilities, and salary range.
- **Applications** — List and filter applications; open full application with Stage 1/2/3 scores, AI summaries, and suggested actions.
- **Screening** — Stage 1: automated resume matrix (skills, experience, education). Stage 2: configurable written questions per job. Stage 3: VAPI voice interviews with transcripts and evaluations.
- **Hiring & onboarding** — Mark candidates as hired (when Stage 3 passed), auto-create onboarding flow from template, and configure company context, documents, and onboarding tasks.
- **Notifications** — In-app notifications for new applications and stage outcomes.

### Platform & security

- **Auth** — Email OTP (no passwords); session-based access; roles: candidate, HR, admin.
- **Prompt-injection mitigation** — Client messages sanitized (no client-supplied system role, length caps); system prompts instruct the model to ignore instructions in user/assistant content; `jobId` validated before use in prompts.
- **Structured AI outputs** — Resume parser and Stage 1 use strict schemas; agents act via defined tools only. See [README-AI-AGENTS.md](README-AI-AGENTS.md) for agents, tools, and security.

---

## Tech stack

| Layer | Stack |
|-------|--------|
| **App** | Next.js 16 (App Router), React 19, TypeScript |
| **Database** | Neon (PostgreSQL), Drizzle ORM |
| **Auth** | Email OTP, JWT sessions, role-based access |
| **AI** | OpenAI (GPT-4o-mini): HR agent, Candidate agent, Onboarding agent, resume parser, Stage 1/2, onboarding flow generator |
| **Voice** | VAPI (Stage 3 voice interviews) |
| **Storage** | Optional R2/S3 for resume uploads |
| **Email** | Nodemailer (e.g. Gmail SMTP) for OTP and stage emails |

---

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL (e.g. [Neon](https://neon.tech))
- [OpenAI API key](https://platform.openai.com/api-keys)
- SMTP (e.g. Gmail app password) for OTP emails

### Install and run

```bash
git clone <repo-url>
cd space42-project
npm install
cp .env.example .env.local   # fill in DATABASE_URL, OPENAI_API_KEY, SMTP, JWT_SECRET
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
For full setup (DB, SMTP, optional R2/VAPI), see **[SETUP.md](SETUP.md)**.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to DB |
| `npm run db:studio` | Open Drizzle Studio (DB GUI) |

---

## Documentation

| Doc | Contents |
|-----|----------|
| [SETUP.md](SETUP.md) | Environment, DB, SMTP, optional R2/VAPI, troubleshooting |
| [README-AI-AGENTS.md](README-AI-AGENTS.md) | AI agents, tools per agent, anti-hallucination, prompting, security (incl. prompt-injection) |
| [CLAUDE.md](CLAUDE.md) | Dev commands, architecture, path aliases, Tailwind |

---

## Deploy

Build and run in production:

```bash
npm run build
npm run start
```

Deploy to [Vercel](https://vercel.com) (or any Node host). Set the same env vars as in `.env.local` (e.g. `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`, SMTP, optional `VAPI_*`, R2).

---

## License

Private. All rights reserved.
