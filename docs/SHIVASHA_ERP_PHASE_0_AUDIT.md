# Shivasha ERP — Phase 0 Repository Audit

Audit date: 2026-11-21
Target: `devops-saurabhpandey/shivasha`, default branch `main`
Scope: read-only review of repository documentation, route registration, core models, authorization middleware, and frontend navigation. No production data or deployment configuration was changed.

## Executive finding
The repository already contains meaningful enterprise foundations. Do not create a second company/tenant system or rebuild HR from scratch. Extend the existing enterprise company, membership, permission, audit, and HR infrastructure. The main gap is that the main React navigation does not yet expose an integrated ERP workspace, and the existing HR entry points to a static HTML/browser-storage module rather than the secure company-scoped HR API.

## Confirmed foundations
- React 19 + Vite frontend; Node.js + Express 5 API; MongoDB/Mongoose; JWT authentication; Socket.IO.
- `server/models/Company.js` defines enterprise company profiles, legal entity, country, currencies, fiscal year, timezone, tax jurisdictions, status, and configuration version.
- `server/models/CompanyMembership.js` provides company-scoped membership and roles: owner, admin, HR manager, finance manager, accountant, auditor, employee, read-only.
- `server/middleware/requireCompanyPermission.js` loads active company and membership from MongoDB and checks permissions server-side; it does not trust role/company claims supplied by the client.
- `server/models/EnterpriseAuditEvent.js` provides company-scoped immutable audit event fields and indexes.
- `server/routes/enterprise.js` is mounted at `/api/enterprise` and provides company/membership management workflows.
- `server/routes/hr.js` is mounted at `/api/hr`; it uses company authorization, company-scoped HR records, payroll workflow validation, and an audit outbox.
- HR models already contain company ownership fields and company-specific unique indexes.
- Existing business, CRM, sales agent, finance-adjacent, MIS, money-management, and e-commerce modules can be integrated rather than duplicated.

## Important integration gaps and risks
1. **No ERP navigation/workspace in the main app:** `src/App.jsx` has separate business suite entries (HR, CRM, MIS, e-commerce, marketing/sales), but no unified ERP workspace/company selector.
2. **HR UI mismatch:** the current HR navigation description says initial data is browser-only and links to `public/hr.html`. The backend HR API is already company-scoped. The ERP work should connect a new/updated HR UI to `/api/enterprise/companies` and `/api/hr`, not expose payroll data in browser local storage.
3. **Finance is not yet a complete ERP ledger:** existing creator finance and money-management features are not equivalent to company double-entry accounting. Build a separate tenant-scoped general ledger with balanced journals and immutable posting/reversal rules; do not treat existing account-level MIS figures as audited financial statements.
4. **BusinessPlatform is user-owned mixed data:** `server/routes/businessPlatform.js` stores leads, campaigns and sales under an individual owner. It is not a multi-company ERP ledger. Integrate/migrate carefully and never assume records have company-level ownership.
5. **Authorization must be checked route by route:** the shared middleware is promising, but each new endpoint and every database query must enforce the same company boundary. Existing modules are not automatically ERP-secure because they require login.
6. **HR migration compatibility:** HR schema permits legacy records with null company ownership in some paths. Review the migration script and actual data before tightening required fields or running any migration.
7. **Existing route documentation is behind the code:** BACKEND.md's API overview does not fully list the enterprise and HR routes now mounted. Update docs alongside implementation.
8. **Public launch hardening remains:** backend docs identify password policy, validation, rate limiting, backups, monitoring, and deployment checks as production-readiness work. ERP financial/payroll modules need additional authorization and audit testing.

## Recommended reuse map
| ERP capability | Existing code to reuse | New work still needed |
|---|---|---|
| Company/workspace | Company, CompanyMembership, enterprise routes | ERP landing/dashboard and company switcher |
| Roles/permissions | companyConfig and requireCompanyPermission | Permission matrix for accounting, purchasing, inventory, approvals |
| Audit | EnterpriseAuditEvent; HR audit outbox | Consistent audit helpers and coverage for every ERP mutation |
| HR/payroll | HR models, routes, payroll workflow | Connect UI to APIs; verify statutory calculations and authorization |
| CRM/sales | business routes, BusinessPlatform, SalesAgent | Company-scoped source of truth and controlled integration |
| Finance | existing creator finance is not a general ledger | Chart of accounts, double-entry journal, posting, reversal, reconciliation |
| Inventory/procurement | no confirmed ERP stock/procurement ledger in reviewed paths | Products/SKUs, warehouses, stock movements, purchase workflow |
| MIS | existing MIS UI and analytics routes | Tenant-scoped reports based on authoritative ERP transactions |

## Safe implementation sequence
1. Build an ERP shell in the existing authenticated React app, with company selection using existing enterprise endpoints.
2. Add a dedicated ERP API/service layer and reusable company-scoped authorization/audit helpers.
3. Implement the smallest end-to-end workflow first: company-scoped suppliers/products and purchase request approval, or inventory ledger after schema/test design.
4. Implement accounting only after defining chart-of-accounts, journal invariants, period close, reversals, and test cases.
5. Connect HR UI to the existing backend only after reviewing HR route permission checks and legacy data migration.
6. Add tenant-isolation tests before any production migration or release.

## Not done in this audit
- No ERP UI, accounting models, inventory models, procurement APIs, or new payroll calculations were implemented.
- No live API health check, database inspection, user-data inspection, build, or test execution was performed.
- No production deployment or database migration was run.

## Phase 0 exit criteria
- Existing enterprise and HR foundations mapped: complete at source-review level.
- Frontend integration points mapped: complete at source-review level.
- Data migration and security risks documented: complete at source-review level.
- Runtime test/build and actual database migration-state verification: still required in a local/self-hosted environment before production implementation.
