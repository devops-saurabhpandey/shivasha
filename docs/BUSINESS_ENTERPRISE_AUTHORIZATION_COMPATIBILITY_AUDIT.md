# Business and Enterprise Authorization Compatibility Audit

Audit branch: `architecture/four-app-shared-core`

## Findings

| Area | Existing control | Four-app migration decision |
|---|---|---|
| `/api/business` leads, products, orders, software enquiries and MIS | `requireAuth`; records are scoped to the authenticated user's owner/customer ID | Preserve existing personal-account behavior during migration. Do not force company tenant membership onto personal CRM data. Add Business product membership only when a grant/onboarding flow exists and the data ownership model is explicit. |
| `/api/business-platform` | `requireAuth`; one platform document per owner | Preserve owner isolation. Treat this as user-owned Business workspace data, not a company tenant until a company/workspace ownership model is introduced. |
| `/api/sales-agent` | `requireAuth`; per-user in-memory rate limit | Keep authentication. Add product entitlement/rate plans later after membership grants and persistent rate-limit policy are designed. |
| `/api/business-ai/ask` | Previously had no authentication middleware | Now guarded by existing `requireAuth`; added a route-registration test and included it in the four-app CI test command. |
| `/api/enterprise/companies` | `requireAuth`; Company + CompanyMembership; active company membership and role-permission checks on company-specific routes | Keep CompanyMembership as the authoritative Enterprise company/tenant membership source. Do not duplicate it with ProductMembership. Add a thin Enterprise product entitlement check only if the product-level subscription/access requirement is distinct from company membership. |
| `/api/hr` | `requireAuth`; selected company from X-Company-ID; database-loaded CompanyMembership; operation-specific permission mapping; companyId on HR records; audit outbox | Preserve this dedicated tenant/permission boundary. Do not replace with generic middleware or client-supplied tenant IDs. |

## Important design decision: avoid duplicate membership truth

- `CompanyMembership` remains the source of truth for Enterprise company membership and role-derived permissions.
- `ProductMembership` is a generic product entitlement primitive, not a replacement for Enterprise company membership.
- Business user-owned records remain owner-scoped. A later Business organization feature may introduce a dedicated Business workspace/organization membership model.
- If an Enterprise product subscription gate is added, it must be checked in addition to (not instead of) the CompanyMembership permission check.
- Do not automatically copy CompanyMembership rows into ProductMembership. That would create two mutable authorization sources and invite drift.

## Current gaps and next actions

1. Business AI is now authenticated. CI includes a test asserting `requireAuth` is the first handler on `POST /ask`.
2. Audit whether Business AI usage should require a Business product entitlement or subscription. Do not enforce this until the onboarding/grant lifecycle is ready.
3. Keep `/api/business`, `/api/business-platform`, and `/api/sales-agent` behavior compatible while introducing explicit Business memberships gradually.
4. For Business organizations, design a tenant model and trusted resource-based tenant resolver before adding tenant-level access checks.
5. Keep Enterprise CompanyMembership and HR authorization intact; added focused HR authorization tests for trusted database membership loading, company scope, role spoofing, suspended membership, inactive companies and storage failures. Full database-backed route integration tests remain required before any refactor.
6. Separately audit Socket.IO conversation joins and live rooms; HTTP authorization middleware does not protect socket events.

## Safety boundary

This audit and the Business AI authentication change do not create ProductMembership records, migrate company memberships, create indexes on a live database, or change production environment settings. No Enterprise route or HR permission behavior is modified.
