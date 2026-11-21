# Shivasha ERP — Product and Implementation Plan

## Decision
Add a modular, SAP-inspired Enterprise Resource Planning (ERP) capability inside the existing Shivasha application. This is a Shivasha-owned ERP module, not a separate app and not SAP software or an SAP integration.

## Product goals
Give small businesses, growing companies, and enterprise teams one workspace for day-to-day operations, with shared identity, permissions, audit history, notifications, files, reporting, and AI assistance. Reuse the existing Shivasha React/Vite frontend, Node.js/Express backend, and MongoDB architecture. Do not replace existing social, marketplace, global-project, education, or CRM features.

## ERP workspace modules
1. **Finance & Accounting** — chart of accounts, journal entries, ledgers, invoices, receipts, payments, expenses, tax/GST-ready records, cash/bank book, profit-and-loss, balance sheet, and cash-flow reports. Financial postings must be auditable and reversible through controlled adjustment entries; never silently overwrite posted transactions.
2. **Sales & Distribution** — customer accounts, quotations, sales orders, delivery status, invoices, returns, receipts, and sales performance.
3. **Purchase & Procurement** — suppliers, purchase requests, approvals, purchase orders, goods receipt, supplier invoices, and payment status.
4. **Inventory & Warehouse** — products/SKUs, locations, stock ledger, inward/outward movements, transfers, adjustments, reorder alerts, batch/serial tracking where needed, and valuation.
5. **HR & Payroll** — employee profiles, departments, attendance, leave, shifts, payroll inputs, payslips, and role-restricted salary data. Payroll/tax rules must be configurable and reviewed for the applicable jurisdiction.
6. **Production & Operations (later phase)** — bills of materials, work orders, production planning, material consumption, and finished goods.
7. **CRM & Service** — leads, customer history, follow-ups, support requests, and service status; integrate with existing Shivasha CRM/Business Directory rather than creating duplicate customer silos.
8. **MIS & Analytics** — role-based dashboards, operational KPIs, exports, scheduled reports, and drill-down to source records.
9. **AI Business Assistant** — natural-language reporting, anomaly/duplicate detection, reorder and cash-flow suggestions, and workflow assistance. AI output is advisory; it must not autonomously post payments, payroll, journals, or destructive stock adjustments.

## Shared platform requirements
- Multi-tenant company/workspace boundary on every business record.
- RBAC permissions by company, branch, department, role, and sensitive action.
- Approval workflows for purchases, expenses, payments, payroll, journals, and stock adjustments.
- Immutable audit events for sensitive changes and financial posting history.
- Secure authentication, server-side authorization, input validation, rate limiting, and tenant-isolation tests.
- Currency, locale, timezone, financial year, tax settings, and document numbering configurable per company.
- Import/export with validation, duplicate detection, and clear error reports.
- Data backup/restore, retention, and account/company data export/deletion procedures.
- Privacy-by-default: salary, bank, tax, and personal employee data visible only to authorized roles.

## Suggested data domains
Use tenant-scoped collections/models such as companies, company_memberships, erp_accounts, erp_journals, erp_journal_lines, erp_customers, erp_suppliers, erp_products, erp_warehouses, erp_stock_movements, erp_sales_orders, erp_purchase_orders, erp_invoices, erp_payments, erp_employees, erp_attendance, erp_leave_requests, erp_payroll_runs, erp_approvals, and erp_audit_events. Confirm existing models and naming conventions before creating anything; reuse existing users, businesses, leads, and customer records where safe.

## Navigation proposal
Add one **ERP** entry to the existing Shivasha navigation. Inside it show a company/workspace selector and permission-filtered modules: Overview, Finance, Sales, Purchase, Inventory, HR & Payroll, Operations, CRM, Reports, and AI Assistant. Hide inaccessible modules and enforce the same permissions in backend APIs.

## Delivery phases
- **Phase 0 — Repository audit and design:** map existing routes, models, auth, UI navigation, CRM/customer data, tests, and deployment constraints; document reuse and migration risks.
- **Phase 1 — ERP foundation:** company/workspace context, memberships, roles/permissions, audit events, navigation shell, and tenant-isolation tests.
- **Phase 2 — Business operations MVP:** customers/suppliers, products, inventory ledger, sales orders, purchase orders, invoices, and approvals.
- **Phase 3 — Finance & MIS:** chart of accounts, double-entry journal posting, payments/receipts, financial statements, reconciliations, and dashboards.
- **Phase 4 — HR & payroll:** employee records, attendance, leave, payroll calculations, approvals, and restricted payslips.
- **Phase 5 — Advanced operations and AI:** production planning, automation, forecasting, and read-only/advisory AI analytics.

## Acceptance criteria
- Existing Shivasha features continue to work; no separate ERP application is created.
- Every ERP API and query enforces tenant and role authorization server-side.
- Automated tests prove one company cannot read or mutate another company's records.
- Financial journals balance (debits equal credits) before posting; posted entries are immutable except through adjustment/reversal flows.
- Inventory changes are represented by traceable stock movements.
- Sensitive HR/payroll fields are access-controlled and never exposed in general dashboards or logs.
- Approval and audit trails are available for all configured high-risk actions.
- Build, tests, migration/backup checks, and end-to-end critical workflows pass before production deployment.

## Scope and rollout notes
This document records the approved product direction and phased implementation plan. It does not claim that ERP screens, APIs, accounting rules, payroll calculations, or production deployment are already implemented. Do not deploy or change production data as part of the planning phase. Start with a codebase audit and implement in small reviewed pull requests.
