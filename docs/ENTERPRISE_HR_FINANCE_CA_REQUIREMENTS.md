# SHIVASHA Enterprise HR, Finance & CA Suite

## Status and product boundary

This document defines the target requirements for evolving the current client-side calculator prototype into a configurable enterprise application. The current module is an estimation prototype only. It is not a payroll system, general ledger, statutory accounting package, tax filing product, or compliance certification.

The product must support configuration for private limited companies, public limited companies, government departments and public-sector undertakings, multinational enterprises, startups, MSMEs, and non-profit entities. Support must be demonstrated through tested company profiles and workflows; it must not be inferred from a generic calculator screen.

## Core design principles

1. **Configuration before calculation:** every calculation is tied to an effective-dated company policy, jurisdiction, currency, tax year/financial year, employee or transaction classification, and approved rate table.
2. **Traceability:** retain input source, formula/version, rule source, calculation timestamp, user, approver, and subsequent adjustments.
3. **No silent assumptions:** missing or conflicting data produces a visible validation state, never a fabricated result.
4. **Separation of duties:** preparer, reviewer, approver, auditor, and administrator permissions are distinct and configurable.
5. **Reproducibility:** a saved calculation can be recalculated with its original rule version and compared with current rules.
6. **Privacy and security:** least-privilege access, tenant isolation, encryption in transit and at rest, secure secrets, retention policies, and auditable exports.
7. **Human sign-off:** statutory filings, payroll release, journal posting, and financial statements require configured approval workflows.
8. **Localization:** currency, date, number format, language, time zone, accounting period, and jurisdiction-specific rules are configurable.
9. **No universal legal assumptions:** tax and labour rules must be maintained per jurisdiction and effective date, with qualified local review.
10. **Fail-safe behavior:** invalid inputs, stale rule tables, missing approvals, and failed integrations must block consequential actions and explain why.

## Company and jurisdiction setup

- Tenant, legal entity, group, branch, department, cost centre, location, and reporting hierarchy.
- Entity type, registration identifiers, fiscal year, accounting basis, functional/reporting currency, and consolidation settings.
- Country, state/province, tax jurisdiction, payroll jurisdiction, work location, and employee residency/classification.
- Effective-dated policies, statutory rate tables, thresholds, exemptions, rounding rules, and rule-source references.
- Multi-currency transactions, exchange-rate source/date, realized/unrealized FX handling, and consolidation translation.
- Configurable numbering series, document templates, approval limits, and retention schedules.
- Import/export templates and migration validation for legacy HR and accounting data.

## HR Manager and payroll requirements

### Employee and organization records
- Employee master, employment type, grade, designation, department, manager, work location, joining/exit dates, and status.
- Compensation structure with effective dates, fixed/variable components, allowances, benefits, reimbursements, deductions, and employer costs.
- Employee documents, consent/acknowledgements, configurable access, and retention/deletion policy.
- Position control, headcount budget, transfers, promotions, contract renewals, and separation workflow.

### Time, leave, and attendance
- Attendance sources and manual correction with reason and approval.
- Shift, roster, holiday calendar, weekly off, overtime, night shift, and time-zone handling.
- Leave types, accrual, carry-forward, encashment, eligibility, approval, and balance reconciliation.
- Exception reports for missing punches, overlaps, negative balances, and unapproved overtime.

### Payroll
- Gross-to-net and cost-to-company calculation by effective-dated pay components.
- Proration for joining, exit, unpaid leave, salary revision, arrears, bonus, incentives, and one-time payments.
- Configurable employee/employer statutory contributions and ceilings by jurisdiction and eligibility.
- Tax withholding, declarations, proofs, exemptions, benefits-in-kind, and year-end reconciliation where applicable.
- Payroll preview, variance checks, maker-checker approval, locked payroll run, payslips, bank payment file, and posting to finance.
- Reversal and off-cycle payroll with linked audit evidence; no silent overwrite of a closed payroll.
- Full and final settlement: notice, leave encashment, gratuity/severance where applicable, recoveries, and exit documents.

### HR reports
Headcount, joiners/leavers, payroll register, salary variance, overtime, leave liability, statutory contribution, cost centre, and audit exception reports.

## Finance Manager requirements

### Accounting foundation
- Configurable chart of accounts and accounting dimensions.
- Double-entry journals with debit/credit equality, period controls, source-document links, and approval workflow.
- General ledger, sub-ledger, trial balance, journal register, opening balances, recurring journals, accruals, prepayments, and reversals.
- Period close checklist, lock/reopen controls, adjustment journals, and consolidation support.

### Receivables and payables
- Customer/vendor master, invoices, credit/debit notes, receipts, payments, advances, and allocations.
- Aging buckets, due dates, collection/dispute status, payment terms, credit limits, and dunning history.
- Three-way match readiness for purchase order, receipt, and supplier invoice.
- Duplicate invoice/payment detection and configurable maker-checker approvals.

### Cash, bank, and treasury
- Cash position and cash-flow forecast by entity, currency, bank account, and period.
- Bank statement import, matching rules, reconciliation, unmatched-item workflow, and reconciliation sign-off.
- Loan schedules, interest, fees, covenants, repayment changes, and prepayment scenarios.
- Liquidity, working capital, current/quick ratios, debt metrics, and cash runway with explicit definitions.

### Planning and performance
- Budgets, forecasts, actual-vs-budget, scenario planning, and variance commentary.
- Cost centre/project profitability, contribution margin, break-even, ROI, NPV, IRR, and sensitivity analysis.
- Inventory valuation and movement integration where inventory is in scope.
- Fixed asset register, capitalization, depreciation methods, disposals, impairment, and asset reconciliation.

### Financial statements
- Configurable balance sheet, profit and loss, cash flow, notes/schedules, and management packs.
- Mapping to applicable accounting standards and entity-specific reporting formats.
- Consolidation, intercompany matching/elimination, and FX translation where enabled.
- Every statement line traceable to ledger accounts and approved journal entries.

## Chartered Accountant, tax, and compliance requirements

- GST/VAT/sales-tax configuration by jurisdiction, registration, supply type, place of supply, tax code, rate, exemption, reverse charge, and effective date.
- Input tax credit eligibility, blocked credits, purchase/sales register reconciliation, credit/debit notes, and exception resolution.
- TDS/TCS/withholding tax by section/category, counterparty status, thresholds, rates, surcharge/cess where relevant, lower/nil certificates, and effective dates.
- Corporate and personal income-tax estimates only where the applicable tax regime, deductions, credits, and assessment year are explicitly configured.
- Statutory depreciation versus book depreciation, asset block/class, additions/disposals, pro-rata rules, and deferred-tax readiness.
- Tax ledger, challan/payment tracking, return-period checklist, reconciliation, and filing evidence.
- Audit schedules, sampling/evidence references, confirmations, exception logs, and review notes.
- Compliance calendar by entity and jurisdiction with owner, due date, reminders, completion evidence, and escalation.
- Versioned tax-rule library with official source links, effective dates, reviewer, approval, and release notes.

## Enterprise controls and integrations

- Role-based access control, optional attribute-based policies, row/entity-level permissions, and privileged access review.
- Multi-step approvals, delegation, escalation, segregation-of-duties checks, and immutable audit events.
- Tenant isolation, secure authentication, MFA/SSO readiness, session controls, encryption, backup/restore, and disaster recovery.
- Data import with preview, validation, duplicate detection, error report, and rollback strategy.
- APIs and integration adapters for HRMS, ERP, banking, invoicing, identity providers, payroll providers, and government portals where lawful and technically supported.
- Observability: structured logs, metrics, tracing, alerting, failed-job queues, retry policies, and operational dashboards.
- Accessibility, responsive mobile/desktop UI, localization, and documented support boundaries.

## Calculation engine requirements

- Centralized pure calculation services; UI components must not independently embed statutory formulas.
- Decimal-safe arithmetic and currency-specific precision/rounding; avoid binary floating-point for ledger postings.
- Input schema validation, range checks, cross-field checks, boundary handling, and explicit null/unknown states.
- Formula ID, version, effective dates, test fixtures, source/rule references, and calculation explanation.
- Separate estimate, draft, approved, posted, and filed states.
- Reconciliation controls: totals, debit/credit balance, payroll-to-ledger, tax-to-ledger, and sub-ledger-to-control-account.
- Exportable calculation detail and reproducible audit snapshot.

## Quality gates and release criteria

A feature is not production-ready until all relevant gates pass:

1. Requirements and acceptance criteria approved by product owner and domain reviewer.
2. Unit tests for formulas, zero/negative/maximum values, rounding, thresholds, leap years, date boundaries, proration, and effective-date transitions.
3. Integration tests for persistence, permissions, approvals, imports/exports, and ledger posting.
4. End-to-end tests for complete employee payroll, invoice-to-payment, bank reconciliation, period close, and tax reconciliation workflows.
5. Security tests for tenant isolation, authorization bypass, injection, sensitive data exposure, and audit-log integrity.
6. Accessibility and responsive-layout checks on supported browsers/devices.
7. Performance/load tests using realistic enterprise data volumes and concurrent users.
8. Backup/restore and disaster-recovery exercise for persisted business records.
9. Finance/HR/CA domain review and jurisdiction-specific legal/tax review before enabling statutory use.
10. Release notes, migration/rollback plan, support runbook, known-limitations register, and sign-off.

## Delivery phases

- **Phase 0 — Discovery and architecture:** confirm target users, first jurisdiction, company profile, legal entity setup, data model, permissions, and integration boundaries.
- **Phase 1 — Foundation:** tenant/entity configuration, jurisdiction/rule versioning, decimal calculation utilities, validation framework, audit events, and test harness.
- **Phase 2 — HR:** employee master, compensation, attendance/leave, payroll preview, approvals, payslips, and payroll-to-ledger handoff.
- **Phase 3 — Finance:** chart of accounts, journals, GL, AP/AR, cash/bank reconciliation, close, budgets, and financial statements.
- **Phase 4 — CA and tax:** GST/VAT, withholding, income tax configuration, depreciation, reconciliations, audit evidence, and compliance calendar.
- **Phase 5 — Enterprise readiness:** SSO/MFA, integrations, consolidation, localization, observability, security/performance, backup and recovery.
- **Phase 6 — Pilot and release:** test with representative company profiles, parallel-run payroll/accounting, resolve variances, obtain domain sign-off, then controlled rollout.

## Initial scope decision

The current feature branch should remain an estimation-only prototype until Phase 0 and Phase 1 are completed. Do not label it enterprise-ready, statutory-compliant, or suitable for production payroll/accounting. The first implementation jurisdiction should be explicitly selected; India can be the first profile, while other countries are enabled only after their rules and workflows are reviewed and tested.


## Phase 2A implementation note — HR tenant isolation

The feature branch now adds optional `companyId` ownership fields and company-first query indexes to Employee, Attendance, Leave, Challan and Payroll Run models. The HR API requires an active company membership for every request, derives the required HR permission from the route, and scopes all HR reads/writes/deletes to the selected company. Payroll snapshots must reference distinct employees belonging to the selected company; employee code, name and UAN are taken from the server-side employee master rather than trusted from the browser.

The HR and Payroll browser pages now load company memberships, support company creation from the HR workspace, and send the selected company ID in the `X-Company-ID` header. The server re-verifies membership on every request.

**Legacy-data migration is deliberately separate.** Existing HR records are not automatically assigned to a company. The explicit owner-to-company mapping migration and company-scoped unique-index migration are documented in [HR Tenant Migration Runbook](./HR_TENANT_MIGRATION_RUNBOOK.md). Both scripts default to dry-run and require explicit `--apply`; the ownership migration refuses to guess when a creator mapping or employee relationship is missing.

Current limits: company ownership is required for newly created HR documents, while legacy documents may remain unassigned until the explicit migration is approved and applied; legacy global unique indexes may still exist until the guarded index migration is applied; route-level database integration tests, full tenant-isolation tests, production backup/restore validation, and security review remain release gates. Do not use unassigned legacy HR records or claim production readiness until these gates pass.
