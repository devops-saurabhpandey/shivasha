# SHIVASHA Business Automation & AI Sales Agent

## Goal
Add a first-party SHIVASHA business automation suite inspired by the user's reference: one workspace for lead management, AI-assisted sales, campaigns, workflow automation, and customer communication.

## Existing integration points
- Reuse the existing SHIVASHA CRM/business leads API (`/api/business/leads`) and authenticated user context.
- Extend the existing Business Platform navigation and account-level MIS rather than creating a disconnected CRM.
- Existing product modules include CRM, MIS, E-Commerce, Social, and Creator Studio.

## Module plan
1. **AI Sales Agent** — lead summaries, suggested replies, qualification questions, follow-up drafts, and next-best-action suggestions. Human approval before sending messages or changing lead status.
2. **CRM & Pipeline** — unified contacts/leads, source, consent, owner, stage, notes, follow-up date, activity timeline, and duplicate detection.
3. **Workflow Automation** — event/condition/action builder; examples: assign new lead, create follow-up task, notify owner, and send an approved template after consent.
4. **Omnichannel Inbox** — email, in-app chat, and WhatsApp Business Platform integration. Keep provider credentials server-side; use official APIs and verified webhooks.
5. **Calling / IVR** — provider adapter for compliant inbound/outbound calling, call status, notes, and opt-out/DND checks. No auto-dialing until consent, provider, and regulatory controls are configured.
6. **Marketing & Campaigns** — audience segments, campaign drafts, scheduling, delivery metrics, unsubscribe/opt-out handling.
7. **E-commerce & Conversion** — connect product/order enquiries to CRM leads and conversion analytics.
8. **Analytics / MIS** — lead source, funnel conversion, response time, campaign results, tasks, and revenue attribution.
9. **Integrations & Admin** — API/webhook settings, role-based access, audit log, rate limits, retention controls, and integration health.

## Delivery phases
- **Phase 1: Foundation** — module navigation, CRM data model/API, activity timeline, consent and audit fields.
- **Phase 2: AI Sales Agent** — secure server-side AI endpoint, lead context, suggested responses, human approval.
- **Phase 3: Workflow engine** — event rules, task creation, notifications, execution history.
- **Phase 4: Channels** — WhatsApp Business, email, chat, then telephony/IVR through configured providers.
- **Phase 5: Campaigns & MIS** — audience segmentation, scheduled campaigns, analytics and exports.

## Safety, privacy, and cost controls
- Explicit consent and channel-specific opt-out/DND enforcement.
- Human approval for external AI-generated messages by default.
- Never expose API keys or provider secrets in the frontend.
- Rate limits, per-account usage limits, audit logs, and clear provider-cost visibility.
- Do not claim integrations are live until credentials, webhooks, and end-to-end tests pass.

## Acceptance criteria
- Existing CRM leads remain compatible and visible in the new suite.
- AI can draft (not silently send) a follow-up using authorized lead context.
- Workflow runs are traceable and failures are visible.
- Channel connection status is clear; unavailable providers show setup instructions.
- Dashboard reports are based on persisted backend data, not browser-only mock data.
