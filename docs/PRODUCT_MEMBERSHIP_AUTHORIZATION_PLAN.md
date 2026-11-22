# Product Membership Authorization Plan

## Current implementation boundary

The four product portals and shared-core architecture are migration scaffolding. Existing login and API routes remain unchanged.

## Opt-in middleware primitive

`server/middleware/requireProductAccess.js` exports `requireProductAccess`. It must be mounted after the existing `requireAuth` middleware. It checks an active ProductMembership for the exact product, tenant scope and optional explicit permission. Expired grants are excluded in the database query. Missing memberships deny access; membership-store errors return 503 and never fall through.

Product-level access is queried with `tenantId: null`. Tenant-scoped routes must inject a trusted server-side `tenantResolver(req)` that verifies the authenticated user's relationship to the requested resource before returning its tenant ID. Do not use an unverified tenant ID from request body, query string or route parameter as authorization evidence.

The middleware is not yet wired to any production route. No membership records or database indexes have been created by this change.

## Required staged rollout

1. Audit each route's product ownership and tenant source.
2. Implement and test trusted tenant resolvers using the owning product's authoritative records.
3. Add explicit ProductMembership grants through an audited administrative workflow.
4. Protect one isolated route at a time, with regression tests.
5. Audit Socket.IO room joins, message membership and live-room permissions separately.
6. Monitor denials and operational errors before expanding coverage.

## Security invariants

- Shared login does not imply cross-product access.
- Product roles and permissions are not inferred from global User roles.
- Tenant IDs supplied by clients are not trusted.
- Missing, inactive, expired or mismatched grants deny access.
- Database or resolver errors never bypass authorization.
- Do not bulk-wire this middleware until route and tenant ownership are verified.
