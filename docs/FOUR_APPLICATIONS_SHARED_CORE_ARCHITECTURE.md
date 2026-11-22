# Shivasha Four-Application Architecture

Status: approved architecture; implementation is staged and non-destructive.

## Product boundaries

1. **Shivasha Social** — social profiles, feed, posts, reactions, comments, follows, groups, messaging, creator/community features.
2. **Shivasha Business** — business directory, storefronts/e-commerce, service listings, freelancers, global projects and leads, marketing, enquiries and sales workflows.
3. **Shivasha Edutech** — CBSE/ICSE learning, books and study material, courses, lessons, assessments, certificates and learning assistant.
4. **Shivasha Enterprise** — organization/branch administration, CRM, sales, finance, HR, inventory, procurement, projects, MIS and operational automation.

Each product has its own frontend, navigation, release lifecycle and product permissions. A user should see only the modules belonging to the selected application.

## Shared Core

The applications use shared platform capabilities through versioned APIs:
- Identity and authentication (one account; application-scoped roles and permissions).
- User and organization identity, with tenant/organization boundaries enforced server-side.
- Shared notification delivery and preferences.
- Media/file metadata and upload policy.
- Audit events, consent/privacy controls and account lifecycle.
- AI orchestration as an optional service, with per-product authorization and usage limits.

Product data remains separated by domain. Shared login does not mean every application can read every other application's data. Enforce least privilege, tenant isolation, server-side authorization, and auditable cross-product access.

## Existing repository assessment (2026-11-22)

- `devops-saurabhpandey/shivasha`: existing React 19/Vite frontend, Node.js/Express API and MongoDB/Mongoose foundation. Current README documents social networking, content publishing and Learning Academy/affiliate groundwork. This is the starting point for Social and the source to audit before extracting shared services.
- `devops-saurabhpandey/shivasha-erp`: separate private repository with product requirements and architecture documentation; its README explicitly says runtime, ERP schema, live database connection and deployment are not implemented. It is the Enterprise product foundation, not a deployed service.
- `devops-saurabhpandey/shivasha-edutech-`: private repository currently containing only a minimal README; it is a placeholder, not a functioning Edutech app.
- `devops-saurabhpandey/shivasha-global-projects-leads`: private repository currently containing only a .gitignore in its root; it is not yet a functioning Business application.
- `devops-saurabhpandey/shivasha-secure-cloud-server`: private infrastructure initiative; its README says it is documentation/placeholder stage and not a production cloud service.
- `devops-saurabhpandey/shivasha-master-dashboard`: private early dashboard and Shivasha Lite append-only JSONL storage prototype. Its README documents single-process/single-node limitations and explicitly says it is an MVP, not production-certified. Do not make it the shared production database without a separate security, durability, concurrency and recovery review.

## Repository/product mapping

- Social: retain `shivasha` as the existing Social application during the first migration stages.
- Business: evolve `shivasha-global-projects-leads` into the Business application after a full requirements and code audit; keep the current repository untouched until implementation begins.
- Edutech: use `shivasha-edutech-` as the Edutech application foundation; rename the repository only as a separate approved GitHub operation.
- Enterprise: continue using `shivasha-erp` as the Enterprise application.
- Shared Core: first extract and document API contracts from the existing Shivasha backend. Keep the existing MongoDB-backed API operational during migration. Evaluate the secure cloud/server and master-dashboard repositories as infrastructure prototypes only; do not silently switch databases or copy production data.

## Migration rules

- Do not delete or rename existing modules, repositories, routes, collections, user records or media as part of the initial split.
- Do not change production deployment targets or environment variables until the target app has passed build, API, authentication, authorization and data-integrity checks.
- Preserve existing user IDs and credentials through a tested identity migration; never copy password hashes into a new system without a reviewed migration design.
- No payment gateway or paid infrastructure is enabled by this architecture decision.
- Cross-application links may be added only after independent app entry points and authentication behavior are tested.

## Delivery phases

### Phase 0 — Inventory and safety baseline
Map frontend routes/components, backend routes/models, database collections, environment variables, deployment workflows, existing branches and open pull requests. Capture current build/test status and a restorable backup plan.

### Phase 1 — Shared Core contracts
Define versioned API contracts for identity, organizations, authorization, notifications, audit and media. Add contract tests. Do not extract live services until compatibility tests pass.

### Phase 2 — Separate application shells
Create clean product navigation and entry points for Social, Business, Edutech and Enterprise. Hide unrelated modules from each product without deleting their code or data.

### Phase 3 — Domain separation
Move one bounded feature at a time to its owning product/API. Use adapters and backward-compatible routes; test data ownership and permissions after every move.

### Phase 4 — Integration and deployment
Set up independent build/deploy pipelines and app-specific configuration. Keep shared services versioned and monitored. Verify login, logout, recovery, access controls, deep links, mobile layouts and rollback.

### Phase 5 — Production readiness
Perform security review, privacy/data export/deletion review, backup/restore drills, load checks, accessibility checks and end-to-end regression tests before public launch.

## Acceptance criteria

- Four clearly separate application entry points and navigation systems.
- One shared identity experience, with product-specific permissions.
- No cross-product data access by default.
- Existing Social app remains available during migration.
- Each application builds and can be deployed independently.
- Shared API contracts have automated tests.
- No secrets committed; no unapproved paid resources.
- Rollback path documented and tested before production cutover.
