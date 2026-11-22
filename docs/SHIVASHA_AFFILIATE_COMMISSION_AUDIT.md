# SHIVASHA Affiliate Commission Controls & Audit

## Admin controls

The Admin Dashboard loads affiliate commission records from `GET /api/affiliates/admin/commissions`. Pending records can be approved or reversed using the existing admin-only review route:

`PATCH /api/affiliates/admin/commissions/:id/review`

A reversal requires a non-empty reason (maximum 300 characters). Approval may include an optional note.

## Audit history

Every newly recorded commission candidate creates a `created_pending_review` audit event. Successful approval and reversal create an event containing:

- Commission record ID
- Admin actor ID
- Previous and new status
- Action (created, approved, reversed)
- Review note
- Database creation timestamp

Administrators can retrieve up to 100 events per commission at:

`GET /api/affiliates/admin/commissions/:id/audit`

The UI exposes a per-commission audit history view. Audit events are append-only through the application API; no edit or delete endpoint is provided.

## Failure handling and limits

- Commission review uses a conditional update from `pending_review` to prevent two admins from reviewing the same pending item concurrently.
- If audit insertion fails after a review transition, the API attempts a compensating update back to `pending_review` and reports the failure. Operators must verify the record if the database is unavailable during both operations.
- Audit insertion for new commission candidates is performed after candidate creation; operators should monitor failed requests and reconcile any candidate missing its creation event.
- This is an application-level audit trail, not a tamper-proof external ledger. Database administrators can still alter stored records.
- Approval is not a payout. Payment gateway, refunds, bank details and money transfers remain disabled/deferred.
