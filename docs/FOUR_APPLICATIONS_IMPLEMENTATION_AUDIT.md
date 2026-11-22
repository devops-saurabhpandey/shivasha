# Four-Application Implementation Audit

Date: 2026-11-22
Repository inspected: `devops-saurabhpandey/shivasha`
Target branch: `architecture/four-app-shared-core`

## Executive finding

The current repository is a combined React/Vite application and Express/Mongoose API. It already contains substantial Social, Business, Education, and Enterprise features. The safest first implementation is an incremental extraction, not a rewrite or immediate split of production deployments.

## Current frontend

- Entry point: `src/main.jsx`; main application shell and navigation: `src/App.jsx`.
- `src/App.jsx` imports many feature screens and controls navigation through one `active` state with a large conditional render block.
- Social screens include feed, posts, profiles, discovery, messages, notifications, saved posts, and live video.
- Business screens include BusinessPlatform, CRM, MIS, E-commerce, SalesAgent, MarketingStudio, CustomerFinder, VisitorsAttractorAI, ContentStudio, AffiliateCenter, CreatorEarnings, and software directory.
- Education screens include LearningAcademy and GlobalEducation, alongside education-related server APIs.
- Enterprise screens include HR, MoneyManagement, tax/professional calculators, and enterprise-related API entry points. Some HR UI text explicitly says the initial version stores data in the browser only; this must not be treated as production-ready server persistence.

## Current backend

- Entry point: `server/index.js`.
- One Express server mounts all product APIs under a shared `/api` prefix.
- Shared authentication currently uses JWT plus a database lookup in `server/middleware/auth.js`.
- Socket.IO realtime currently shares the same server and JWT authentication.
- MongoDB/Mongoose is the shared persistence layer.
- Route families observed:
  - Shared/platform: auth, users, notifications, messages, analytics, AI assistant, prompts, subscriptions, ads.
  - Social: posts, live videos, content, creator finance, affiliates.
  - Business: business, business platform, business AI, sales agent.
  - Education: education, education quiz, learning academy, calendar, Ayurveda AI (domain classification should be finalized with product owner).
  - Enterprise: enterprise, HR.
  - Media/creator cross-cutting: YouTube automation/render workers, cinematic video, UI/UX AI.
- Models include User, Post, Conversation, Message, Notification, education models, affiliate/creator-finance models, enterprise Company and CompanyMembership, HR, and project/media models.

## Security and separation findings

1. Authentication is shared, but the inspected middleware does not by itself provide app-scoped permissions or tenant context.
2. The existing Enterprise Company and CompanyMembership models establish a useful tenant-membership foundation. Keep company-scoped authorization server-side and validate membership on every enterprise request.
3. User currently contains social profile/follower fields and a broad role enum. Avoid expanding this single global role into an all-products authorization model.
4. Business lead/product/order schemas in `server/routes/business.js` are currently declared inside the route module. A later extraction should move them to explicit models with ownership tests, but must preserve collection names and existing records.
5. Current frontend authentication state is stored in localStorage. Do not copy access tokens across product-specific origins or assume one origin's localStorage is shared by four applications.
6. Socket.IO conversation room joins and typing events need authorization checks against conversation membership before being exposed as a shared service boundary.
7. Do not make the existing master-dashboard JSONL prototype the production database. MongoDB remains the current persistence foundation until a separately reviewed migration is approved.

## Proposed repository/product mapping

| Product | Existing frontend areas | Existing API/model areas |
|---|---|---|
| Shivasha Social | Feed, posts, profiles, discover, messages, notifications, live | users, posts, messages, notifications, liveVideos, content |
| Shivasha Business | BusinessPlatform, CRM, MIS, E-commerce, SalesAgent, marketing, CustomerFinder, VisitorsAttractorAI, software directory, affiliates | business, businessPlatform, businessAI, salesAgent, affiliates, subscriptions, ads |
| Shivasha Edutech | LearningAcademy, GlobalEducation | education, educationQuiz, learningAcademy, Learning* and Education* models |
| Shivasha Enterprise | HR, MoneyManagement, tax/professional calculators, enterprise workspace | enterprise, HR, Company, CompanyMembership, EnterpriseAuditEvent |

Cross-cutting capabilities (auth, identity, authorization primitives, notifications, media metadata, audit events, AI orchestration, configuration) should be owned by the Shared Core. Product-specific business logic and data access remain owned by each product domain.

## Phased implementation plan

### Phase 0 — Baseline and architecture (current)
- Preserve the approved four-product architecture.
- Inventory frontend screens, API route mounts, models, environment configuration, workflows, and existing tests.
- Record migration constraints and security boundaries.

### Phase 1 — Establish safe boundaries (next)
- Add a typed/validated product module registry and navigation grouping without removing current routes.
- Extract shared API middleware/utilities only where tests can prove behavior remains compatible.
- Add app-scoped authorization primitives and tests before introducing separate product clients.
- Add explicit API ownership map and route-to-product tests.

### Phase 2 — Separate frontends incrementally
- Create independent product entry points/build targets while reusing the current UI components.
- Keep existing GitHub Pages/Render deployment path as the compatibility deployment until each new target passes smoke tests.
- Avoid changing production domains, secrets, payment gateway, or OAuth callbacks during this phase.

### Phase 3 — Secure shared backend
- Keep one backend deployment initially, organized by shared core and product domains.
- Add tenant/app scopes, server-side entitlement checks, audit logging, and realtime membership authorization.
- Preserve MongoDB collections and identifiers; use additive migrations only.

### Phase 4 — Release independently
- Deploy each frontend only after build, auth, role, data-isolation, and mobile smoke tests pass.
- Consider separate backend services only when operational evidence justifies them.
- Maintain rollback to the current combined frontend throughout rollout.

## Acceptance gates

- Existing app build and current API tests pass.
- Existing login, feed, messaging, business, education, and enterprise flows remain functional.
- No cross-company or cross-product data leakage.
- Every new route has authentication/authorization tests appropriate to its data.
- No secrets, user data, or production configuration are committed.
- No production deployment or payment setting is changed as part of architecture extraction.

## Explicitly out of scope for this audit commit

- No production database changes or migrations.
- No deletion/renaming of existing routes, collections, components, repositories, or deployments.
- No payment gateway integration.
- No token/session migration.
- No changes to live deployment settings or secrets.
