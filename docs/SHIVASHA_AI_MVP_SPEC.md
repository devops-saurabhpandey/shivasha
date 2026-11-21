# SHIVASHA AI — MVP Build Specification

## Product goal
Deliver a first-party SHIVASHA-branded AI chat workspace inside the SHIVASHA app. It must use a configured AI provider through the SHIVASHA backend; never call paid AI providers directly from the browser or expose secrets.

## MVP scope
### User experience
- Responsive chat screen with conversation list, new chat, message composer, send/cancel states, retry on errors, and empty/loading states.
- Hindi and English input/output (language is selected by the user through the prompt; no guarantee that every model responds perfectly).
- Conversation history saved to the authenticated user's account.
- Clear notice when the service is not configured or temporarily unavailable.
- Basic thumbs-up/down feedback can be a later increment, not a launch blocker.

### Backend API contract (proposed)
- `GET /api/ai/status` — returns enabled/configured status and user-facing availability, without exposing secrets or provider account details.
- `GET /api/ai/conversations?limit=20&cursor=...` — list current user's conversations only.
- `POST /api/ai/conversations` — create a conversation.
- `GET /api/ai/conversations/:id/messages?limit=50&cursor=...` — fetch messages after verifying ownership.
- `POST /api/ai/conversations/:id/messages` — accept a user message, enforce auth, input limits, rate limits and usage budget; call provider server-side; persist user and assistant messages; return the answer and safe metadata.
- `DELETE /api/ai/conversations/:id` — delete a conversation owned by the current user, subject to documented retention policy.
All routes require authentication except the status endpoint. Never trust a conversation ID without an ownership check.

## Data model (suggested)
- Conversation: `_id, ownerUserId, title, createdAt, updatedAt, lastMessageAt`.
- Message: `_id, conversationId, ownerUserId, role, content, providerModelLabel, usageSummary, createdAt`.
- UsageEvent: `ownerUserId, productId, provider, modelLabel, inputTokens, outputTokens, estimatedCost, status, createdAt`.
Store only the minimum necessary data. Do not log full prompts or answers in operational logs by default.

## Provider adapter
- Define a server-side interface such as `generateReply({messages, userId, requestId})`.
- Configure provider credentials via environment secrets on the backend host.
- Use timeouts, bounded retries, clear provider error mapping, model allowlists and cost/usage caps.
- Keep provider-specific code behind an adapter so the UI is not coupled to one vendor.
- If no provider is configured, return a clear `503 AI_NOT_CONFIGURED` response. Never return fake/sample answers as if they were real AI.

## Security and reliability gates
- Authentication and per-conversation ownership checks on every private endpoint.
- Input length and history-window limits.
- Per-user/IP rate limits and a daily/monthly usage budget.
- Server-side secret management; no secrets in Vite `VITE_*` variables or committed files.
- HTML/script-safe rendering of assistant output; do not execute model output as code.
- Error redaction, request IDs, timeouts, and graceful provider failure.
- Tests for unauthenticated access, cross-user conversation access, oversized input, rate limits, provider failure and normal success.
- Document data retention and user deletion behavior before launch.

## Implementation sequence
1. Inspect the current backend repository, auth middleware, user model and deployment environment; confirm actual route conventions before coding.
2. Add provider adapter and status endpoint.
3. Add authenticated conversation/message persistence and ownership tests.
4. Add frontend chat UI and connect it to the API.
5. Add rate/usage limits and monitoring.
6. Run frontend build, backend tests, security checks and staging smoke tests.
7. Deploy only after secrets are configured and health checks pass.

## Explicitly out of scope for MVP
- Training a foundation model from scratch.
- Autonomous agents that take external actions.
- File uploads and RAG (planned for SHIVASHA Knowledge AI).
- Voice/video generation.
- Paid checkout/subscriptions until pricing, payment provider, refund and tax requirements are decided.

## Acceptance criteria
- A logged-in user can start a conversation, send a message, see the real provider response, return later and see saved history.
- A second user cannot read, alter or delete the first user's conversations.
- Missing provider configuration gives an honest, helpful unavailable message.
- Rate limits and usage caps prevent uncontrolled provider spend.
- No provider API secret is present in browser bundles, logs or Git history.
- Frontend build, backend tests and staging smoke tests pass.
