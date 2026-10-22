# SHIVASHA Software Factory — Production Roadmap

## Objective
Build original SHIVASHA-branded software products for the problem areas represented by common AI and productivity tools. The goal is not to copy proprietary code, logos, or protected interfaces. Use provider APIs or properly licensed open models where appropriate.

## Product portfolio (planned unless explicitly marked available in the app)
1. **SHIVASHA AI** — assistant for chat, writing, research and coding.
2. **SHIVASHA Flow** — visual workflow automation, triggers, actions, webhooks and logs.
3. **SHIVASHA Agents** — controlled multi-step agents with permissions and human approval gates.
4. **SHIVASHA Knowledge AI** — document ingestion, retrieval, source-grounded answers and access controls.
5. **SHIVASHA Model Studio** — provider/model configuration, prompt testing and usage/cost visibility.
6. **SHIVASHA Multimodal AI** — supported image, audio, text and document workflows.
7. **SHIVASHA Video Studio** — scripts, storyboards and optional licensed video-generation integrations.
8. **SHIVASHA WorkSuite** — notes, tasks, projects and team workspace.
9. **SHIVASHA AI Monitor** — latency, errors, evaluation, request metadata and cost monitoring.
10. **SHIVASHA SEO Studio** — SEO audits and authorized Search Console / Analytics integrations.
11. **SHIVASHA System Architect** — flowcharts, system maps and architecture documentation.
12. **SHIVASHA Brand Intelligence** — brand profile consistency and public website audits.

## Delivery phases
### Phase 0 — Foundation
- Keep the existing React app and Node/Express API as the starting point.
- Define product registry, module boundaries, environment configuration and release process.
- Add tests, lint/build checks, error handling and deployment verification.
- Establish account authentication, role-based authorization, rate limits and secure secret handling before exposing AI actions.

### Phase 1 — First usable products
- SHIVASHA AI: server-side provider adapter, chat UI, history, limits and error states.
- SHIVASHA Knowledge AI: document upload, extraction, retrieval, source citations and per-user access controls.
- SHIVASHA WorkSuite: basic tasks and projects, ownership and permissions.

### Phase 2 — Automation
- SHIVASHA Flow: small allowlisted trigger/action catalogue, execution queue, retries, logs and stop controls.
- SHIVASHA Agents: single-agent workflows first; explicit tool permissions and approval before external or irreversible actions.

### Phase 3 — Creator and business tools
- SHIVASHA Video Studio: start with script/storyboard/project management; only add generation through reviewed providers.
- SHIVASHA SEO Studio: local audits first; connect external analytics only with user authorization.
- SHIVASHA Brand Intelligence: brand profiles and website consistency reports.

### Phase 4 — Platform and operations
- SHIVASHA Model Studio and SHIVASHA AI Monitor.
- SHIVASHA Multimodal AI using capabilities actually supported by configured providers.
- SHIVASHA System Architect diagram editor.
- Split services only when scaling, security or operational evidence justifies it.

## Suggested architecture
- Frontend: React (reuse the existing app patterns).
- API: Node.js/Express, modular routes and service layer.
- Data: MongoDB with per-user/tenant authorization; separate collections and access rules by module.
- Files: object storage with size/type checks and signed access.
- Long jobs: background queue with retry, timeout and cancellation.
- AI: server-side provider adapters; never expose API keys in browser code.
- Operations: structured logs with redaction, rate limiting, usage budgets, backups, monitoring and automated tests.

## Release gates for every product
1. Requirements and acceptance criteria approved.
2. Authentication, authorization and tenant isolation tested.
3. Unit and integration tests pass.
4. Mobile/responsive and accessibility checks completed.
5. Secrets, upload validation, rate limits and abuse controls reviewed.
6. Usage limits and provider cost controls configured.
7. Privacy, data retention and user-facing limitations documented.
8. Production build and deployment health verified.
9. Rollback path and support/incident ownership documented.

## Commercial model
A Free tier and a Paid tier may be considered for each product. Do not advertise paid capabilities, prices, subscriptions or integrations as active until implemented, tested and disclosed. AI and video costs must be measured before setting limits and prices.

## Status policy
The catalogue cards are roadmap entries, not proof that the products are implemented. Update a product status only when a working feature has been verified in the target environment. Third-party provider APIs, availability, terms and fees can change.
