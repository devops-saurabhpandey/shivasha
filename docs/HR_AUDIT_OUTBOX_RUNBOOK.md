# SHIVASHA HR audit outbox runbook

## Why the outbox is embedded

The repository's self-hosted Compose topology runs MongoDB 8 as a standalone mongod (no replica-set configuration). Multi-document transactions therefore cannot be assumed. HR mutations use a **single-document durable outbox** instead:

1. Each HR employee, attendance, leave, challan and payroll document carries an auditOutbox array.
2. A create writes the business document and its first audit intent in the same insert. An update/archive/status transition uses one atomic MongoDB document update to change the business record and append its audit intent together.
3. The application worker materializes each intent into EnterpriseAuditEvent, using the outbox event ObjectId as the audit document _id idempotency key.
4. The worker removes the embedded intent only after it has verified the central audit record. If it crashes after inserting but before removing, retry sees the same _id and safely completes the acknowledgement.
5. The worker runs after MongoDB connects and retries every five seconds. A mutation also attempts an immediate flush.

The application MongoDB connection requests acknowledged, journaled writes (w: 1, j: true, 10-second write timeout) so a successful HR write does not depend only on an unjournaled acknowledgement. This design does not require replica-set transactions and is compatible with the repository's standalone MongoDB Compose service as well as replica-set deployments. It deliberately does not claim protection from disk loss, database administrators with write access, or a total loss of the database; backups and access controls remain necessary.

## Failure behavior

- If the central audit collection is temporarily unavailable after the HR document is committed, the API returns HTTP 202 with audit.status = pending and the event ID. The mutation and audit intent are already durable in the same HR document. Clients must not blindly repeat that mutation.
- The worker keeps retrying. It deletes the embedded intent only after the central event is confirmed.
- Each document accepts at most 250 pending audit intents. At capacity, new updates to that document are blocked with HTTP 503; the business change is not applied. This bounds document growth and makes an extended audit outage visible rather than silently dropping events.
- Employee, attendance and challan deletes are archives (deletedAt/deletedBy), not physical deletes. Historical evidence is retained. Only Draft payroll runs may be archived; Approved and Paid runs remain retained.
- Audit details intentionally record changed field names and workflow metadata, not salary values, UANs, leave reasons or other unnecessary personal data.

## Operations

- Watch application logs for 'SHIVASHA HR audit outbox has pending events' and 'SHIVASHA HR audit outbox drain failed'.
- Investigate MongoDB availability, write permissions, storage capacity and EnterpriseAuditEvent validation/index health before retrying or restarting workers.
- Do not manually clear auditOutbox arrays. Doing so would discard the durable source event.
- The existing /api/enterprise/companies/:companyId/audit-events endpoint reads the materialized audit collection. A 202 response means the event remains queued until the worker can materialize it.

## Integration tests

The pull-request CI backend job runs the same integration suite against the isolated standalone MongoDB service, then runs the complete backend test suite and JavaScript syntax scan. The separate frontend job runs the production Vite build; the repository's Docker and business-module workflows remain additional checks.


The route-level integration test uses an actual MongoDB server, not mocked Mongoose models. CI provisions a standalone mongo:8 service and sets MONGODB_TEST_URI to shivasha_hr_test. The test refuses to run unless the database name ends in _test, drops only that explicitly isolated database, and never reads MONGODB_URI. No production migration is run by this test.

## Release limitations

The outbox closes the HR mutation/audit dual-write gap for the covered HR routes. It does not make the current calculator prototype a complete payroll, general ledger, statutory accounting or tax-filing system. Jurisdiction-specific rules must be effective-dated, sourced, independently reviewed and tested for each country/state and company profile before consequential use. Security, backup/restore, retention, legal/tax and HR/finance domain sign-off remain release gates.
