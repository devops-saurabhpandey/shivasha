# Product Membership and Authorization Plan

## Goal

Keep one shared Shivasha identity/login while enforcing separate access for Social, Business, Edutech, and Enterprise. Authentication proves who the user is; product membership and tenant membership decide what that identity may access.

## Existing foundations

- `User` is the shared identity record. Its legacy global `role` is not a product entitlement.
- `EnterpriseCompany` and `EnterpriseCompanyMembership` already model Enterprise company membership. They are not a replacement for cross-product membership.
- `requireAuth` verifies the JWT and account status, but does not establish product or tenant authorization.
- Socket.IO authenticates the JWT but conversation-room joins currently need independent membership checks.

## Proposed additive membership record

A new `ProductMembership` record should contain:

- `userId`: required User reference
- `productId`: one of `social`, `business`, `edutech`, `enterprise`
- `tenantId`: nullable tenant/company reference; null only for product-level access
- `role`: product-specific role identifier, never interpreted across products
- `permissions`: explicit permission strings, resolved server-side from trusted role policy
- `status`: `active`, `pending`, `suspended`, or `revoked`
- `grantedBy`, `createdAt`, `updatedAt`, and optional expiry/revocation metadata

Recommended uniqueness: `{ userId, productId, tenantId }`. Ensure null-tenant uniqueness is handled intentionally by MongoDB indexes (partial indexes may be needed). Do not auto-create grants from legacy global User.role or from login.

## Authorization rules

1. Missing membership denies access.
2. Membership must be active and match the requested product exactly.
3. Tenant-scoped requests require an exact tenant match; never trust tenantId from a client without validating membership.
4. Required permissions must be explicitly present in the trusted membership/role policy.
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

## Current scope

This PR adds only a pure fail-closed policy helper and tests. It does not create memberships, grant access, change login, enforce routes, modify data, or alter production deployments.
