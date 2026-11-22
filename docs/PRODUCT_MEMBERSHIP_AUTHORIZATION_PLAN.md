# Product Membership and Authorization Plan

## Goal

Keep one shared Shivasha identity/login while enforcing separate access for Social, Business, Edutech, and Enterprise. Authentication proves who the user is; product membership and tenant membership decide what that identity may access.

## Existing foundations

- `User` is the shared identity record. Its legacy global `role` is not a product entitlement.
- `EnterpriseCompany` and `EnterpriseCompanyMembership` remain the existing Enterprise company-membership source; they are not a replacement for cross-product membership.
- `requireAuth` verifies the JWT and account status, but does not establish product or tenant authorization.
- Socket.IO authenticates the JWT but conversation-room joins need independent membership checks.

## Additive membership model

`server/models/ProductMembership.js` adds a separate record with:

- `userId`: required User reference.
- `productId`: exactly one of `social`, `business`, `edutech`, or `enterprise`.
- `tenantId`: nullable ObjectId; null represents product-level membership. Tenant ownership is resolved by the relevant product service.
- `role`: explicit product-prefixed role identifier; a role from one product cannot validate in another product.
- `permissions`: explicit permission strings, empty by default; no grants are inferred from client input.
- `status`: `pending`, `active`, `suspended`, or `revoked`. New memberships default to `pending`.
- `grantedBy`, `expiresAt`, `revokedAt`, and timestamps.

Two partial unique indexes distinguish product-level memberships from tenant-scoped memberships. This avoids treating null tenant IDs as one shared tenant while allowing a user to belong to multiple tenants in the same product.

## Authorization rules

1. Missing membership denies access.
2. Membership must be active and match the requested product exactly.
3. Tenant-scoped requests require an exact tenant match; never trust tenantId from a client without validating membership.
4. Required permissions must be explicitly present in trusted membership/role policy.
5. A role name in one product conveys no rights in another product.
6. Existing EnterpriseCompanyMembership remains an additional Enterprise tenant check where company records are accessed.
7. Shared platform endpoints have their own narrowly scoped policies; shared login does not mean shared data access.
8. Socket.IO conversation joins, typing, live rooms, and message events need equivalent server-side membership checks.

## Safe rollout sequence

1. Inventory every route, data model, tenant boundary, and realtime event.
2. Add schema and pure policy tests without changing current route behavior.
3. Define product-specific roles and permissions with product owners.
4. Add opt-in middleware to a small, fully audited route group and integration tests.
5. Backfill memberships only from verified ownership/consent data; dry-run and review before writes.
6. Migrate remaining route groups and realtime handlers, then enforce deny-by-default.
7. Keep legacy login compatible during migration; do not deploy a global enforcement switch until coverage is complete.

## Current implementation boundary

This PR adds the additive ProductMembership model and local schema tests, alongside the pure fail-closed policy helper. It does not create database records, build indexes in a live database, grant access, change login, enforce routes, modify production data, or alter production deployments. Index creation must be reviewed and run through an explicit migration after checking existing data and MongoDB index compatibility.
