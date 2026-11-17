# Shivasha Global Projects & Leads — Phase 1 Audit

Status: discovery and readiness baseline. This document records verified repository facts and separates them from local-server checks that still require an on-device report.

## Confirmed repository baseline
- Repository: https://github.com/devops-saurabhpandey/shivasha
- Default branch: main
- Frontend: React 19 + Vite 7
- Backend: Node.js + Express 5
- Database: MongoDB / Mongoose 8
- Authentication: JWT; admin routes use requireAuth and a database-backed role === admin check
- Realtime: Socket.IO
- Existing self-hosting stack: Docker Compose with frontend, API, MongoDB and optional cinematic worker
- Existing API readiness endpoints: /api/health (liveness) and /api/ready (MongoDB-aware readiness)
- Existing business modules include business, business-platform, business-AI, sales-agent, admin and analytics routes.

## Existing work to preserve
- Keep the social app, business directory, CRM, sales agent, admin dashboard, and self-hosted Docker stack intact.
- PR #69 (feature/github-project-sync) is an open draft for GitHub repository/project synchronization. Do not overwrite, merge, or repurpose it as the Global Projects implementation.
- An older branch named feature/shivasha-global-projects exists but is six commits behind main with zero unique commits at the time of this audit. It is not a safe implementation base.
- Use a separate feature branch for Global Projects work and merge only through review.

## Phase 1 scope
1. Confirm local self-hosted Docker containers, repository worktree state, and MongoDB readiness.
2. Confirm the deployed backend's health/readiness independently of GitHub Pages frontend status.
3. Map existing authentication, admin authorization, business lead, logging, test and deployment patterns.
4. Define the Global Projects data model and continuous-monitoring job contract before adding external connectors.
5. Establish a source/provenance policy: every discovered opportunity must retain source URL, source name, discovery time, last-checked time, verification status and eligibility notes.
6. Establish safe automation boundaries: AI may discover, deduplicate, score and draft; sending messages, submitting tenders, accepting terms or committing funds requires explicit human approval.

## Proposed continuous-monitoring design
- A persistent job queue/worker, not an in-process setInterval tied to an API web process.
- Configurable polling intervals per source, with provider-specific rate limits, retries, backoff and per-run budgets.
- Initial source adapters should use official/public APIs or permitted procurement feeds. No login-wall scraping, CAPTCHA bypass, private-data harvesting or unsolicited bulk messaging.
- Idempotent upserts and deduplication keys to prevent duplicate company/project records.
- Audit logs for every discovery, verification, scoring, draft and approval action.
- Human approval gate before any external communication or official submission.
- Monitoring should report stale sources and connector failures; it must never label a lead verified merely because a search result exists.

## Suggested domain boundaries
- Organizations and company profiles
- Project opportunities and tender notices
- Source connectors and connector runs
- Verification evidence and provenance
- Match scores and scoring explanations
- Proposal/quotation drafts
- Approval requests and audit events
- Follow-up tasks and notifications

## Not yet verified
The GitHub repository alone cannot prove that the user's WSL2 Ubuntu containers are currently running or that the local MongoDB volume is healthy. The local docker compose ps, docker compose config --quiet, Git worktree status and API health response must be captured before changing or restarting the self-hosted stack.

The Render account shows a service named shivasha linked to this repository's main branch, root directory server/, with auto-deploy enabled. This is deployment metadata, not proof that the current API process or database is healthy.

## Exit criteria
- Local Docker status and database readiness recorded.
- Existing working tree changes preserved.
- Backend route/auth/test conventions documented.
- Monitoring source policy and worker lifecycle agreed.
- No credentials, tokens, or private environment values committed.