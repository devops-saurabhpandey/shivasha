# SHIVASHA HR Tenant Migration Runbook

## Purpose

Move legacy HR records into verified company tenants without guessing which company owns employee, attendance, leave, challan or payroll data. The HR API now requires an authenticated company membership and scopes every record query/write by `companyId`.

## Important safeguards

- Do not use legacy HR data in production until ownership is reviewed and migration is complete.
- Do not assign every old record to the first company, a default company, or the current user.
- Take and verify a restorable MongoDB backup before applying any migration.
- Run the migration during a maintenance window with HR writes paused.
- The migration scripts are not run automatically at application startup.
- `companyId` is required for newly created HR documents; legacy documents without it remain readable by the migration scripts only. The HR API never reads or writes unassigned legacy records.
- The existing global unique indexes on employee code and payroll month remain in MongoDB until the guarded index migration is explicitly applied.

## 1. Create and verify company workspaces

Create each legal company through the HR workspace's Company workspace form or the authenticated `POST /api/enterprise/companies` endpoint. Confirm the exact registered legal name, entity type, country, currency, fiscal-year start and time zone.

The creating user becomes the company owner. Add the relevant HR managers and payroll approvers as company members. A global SHIVASHA account role is not a substitute for company membership.

## 2. Prepare an explicit legacy owner-to-company map

First inspect legacy creators in MongoDB. Typical review queries:

```javascript
db.hremployees.aggregate([{ $group: { _id: "$createdBy", count: { $sum: 1 } } }])
db.hrchallans.aggregate([{ $group: { _id: "$createdBy", count: { $sum: 1 } } }])
db.hrpayrollruns.aggregate([{ $group: { _id: "$createdBy", count: { $sum: 1 } } }])
```

Verify each creator's records against payroll registers, employee files, company records and business-owner confirmation. Attendance and leave records inherit their company from the referenced employee, not from the person who recorded them.

Create a secure JSON file outside the repository and do not commit it:

```json
{
  "LEGACY_CREATOR_USER_OBJECT_ID_1": "VERIFIED_COMPANY_OBJECT_ID_1",
  "LEGACY_CREATOR_USER_OBJECT_ID_2": "VERIFIED_COMPANY_OBJECT_ID_2"
}
```

Every legacy employee, challan and payroll-run creator must have a verified mapping. If one user created records for more than one company, stop: the simple creator map is insufficient. Those records need a record-level ownership mapping and manual review before migration.

## 3. Dry-run the ownership migration

From the `server` directory, set `MONGODB_URI` and run:

```bash
npm run migrate:hr-tenant -- --mapping=/secure/path/owner-company-map.json
```

The default mode is dry-run. Review the proposed counts for employees, attendance, leaves, challans and payroll runs. The script also rejects:
- Missing or inactive company references
- Missing creator mappings
- Attendance/leave records whose employee reference is missing
- Existing company IDs that conflict with the employee's company
- Payroll snapshots that reference an employee from another company

Do not proceed until the dry-run output and ownership decisions are approved.

## 4. Apply ownership migration

After backup, approval and maintenance-window confirmation:

```bash
npm run migrate:hr-tenant -- --apply --mapping=/secure/path/owner-company-map.json
```

The script is idempotent and only fills missing/null company IDs. It does not overwrite existing company ownership. Review the final unassigned-record counts and independently verify sample employees, attendance, leave, challans and payroll snapshots for every company.

## 5. Migrate global unique indexes

First run the index migration in dry-run mode:

```bash
npm run migrate:hr-indexes
```

It refuses to continue while any HR collection has unassigned records or duplicate employee codes/payroll months inside the same company.

After review, apply:

```bash
npm run migrate:hr-indexes -- --apply
```

This replaces the old global employee-code and payroll-month unique indexes with company-scoped unique indexes. It does not change HR documents.

## 6. Verify tenant isolation

Use two test companies and at least two users with different memberships. Verify:
- Company A HR manager can read/write only Company A HR records.
- Company B HR manager can read/write only Company B HR records.
- A user without active membership receives 403.
- An unknown/inactive company receives 404.
- Missing or malformed `X-Company-ID` receives 400.
- Supplying another company's employee, attendance, leave, challan or payroll-run ID cannot read, edit or delete it.
- Payroll snapshots reject duplicate employees and employee IDs belonging to another company.
- HR manager cannot use finance or tax APIs; payroll approval requires `hr.payroll.approve`.

The current automated tests cover permission mapping and model ownership/index definitions. Route-level database integration tests and production security review are still required before this phase is approved for production.

## Current implementation boundary

The HR API accepts the selected company in the `X-Company-ID` header. The HR and Payroll browser pages load the user's active company memberships and persist only the selected company ID in browser storage. Authorization is rechecked against MongoDB for every request; the stored ID is not trusted as proof of access.

Legacy unassigned records are intentionally invisible to the new company-scoped HR API until an explicit migration is completed. The scripts do not infer legal ownership and are not run automatically.
