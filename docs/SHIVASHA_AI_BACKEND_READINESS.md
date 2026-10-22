# SHIVASHA AI — Backend Readiness and Implementation Checklist

## Repository inspection finding
The current `shivasha` repository contains a Vite/React frontend (the root `package.json` exposes `dev`, `build`, and `preview` scripts). The inspected root does not contain `server.js` or `backend/server.js`. Do not assume the API server source lives in this repository. Before implementing chat endpoints, identify the actual backend repository/service and inspect its authentication middleware, database models, deployment configuration and health checks.

## Next engineering task (blocked on backend source)
1. Identify the active SHIVASHA backend repository and deployed service.
2. Inspect its existing auth/token conventions and MongoDB connection/model patterns.
3. Confirm how frontend `API_BASE` is configured for local, preview and production.
4. Implement authenticated `/api/ai/status`, conversation and message endpoints in the actual backend.
5. Add a server-side provider adapter; if no provider secret is configured, return `503 AI_NOT_CONFIGURED` and show an honest UI message.
6. Add ownership checks, input limits, rate limiting, usage budgets, request timeouts and redacted logs.
7. Add tests for authentication, cross-user access denial, provider failure, oversized prompts and normal responses.
8. Connect the frontend chat component only after the API contract is implemented.
9. Run frontend build, backend tests and staging smoke tests before production deployment.

## Configuration requirements
- Store provider credentials in the backend host's secret/environment configuration.
- Never put provider API keys in frontend source, Vite public environment variables, mobile bundles or Git.
- Keep model/provider names allowlisted and usage bounded.
- Do not log full user prompts or answers by default.
- Define retention/deletion behaviour before storing conversation history.

## Release acceptance
A logged-in user can create a chat, receive a real provider response and reload history; another user cannot access it; missing configuration and provider errors are clearly surfaced; spend limits and tests pass; and deployment health is verified.

## Current status
This document is an implementation handoff, not a claim that the AI API is already built. Frontend/backend integration remains blocked until the backend source and deployment are identified.
