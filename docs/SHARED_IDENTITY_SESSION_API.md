# Shared Identity Session API

Status: authenticated session discovery endpoint implemented; cross-subdomain browser SSO is not enabled yet.

## Endpoint

`GET /api/auth/session`

Authentication: existing shared API JWT via `Authorization: Bearer <token>`.

The endpoint is available to all four frontend applications through the same API origin. It returns the authenticated identity and a read-only summary of memberships across Social, Business, Edutech and Enterprise.

## Response shape

- `identity`: user ID, display name, email and avatar URL.
- `applications`: all four product IDs and their membership status.
- `memberships`: per-product roles, explicit permissions, status, expiry and a boolean indicating whether a membership is tenant-scoped.
- Tenant identifiers and password hashes are never returned.
- `sharedCore`: availability flags for shared identity, API and database.

Membership status is discovery metadata only. It does not grant access. Product APIs must enforce `requireProductAccess` after authentication, with trusted server-side tenant resolution where applicable.

## Compatibility and rollout

- Existing `POST /api/auth/login` and `POST /api/auth/register` behavior and JWT format remain unchanged.
- Existing `GET /api/users/me` remains available to avoid breaking the current Social frontend.
- Existing users and password hashes are not migrated or modified.
- A user can use the same account credentials against the shared identity database from each app. Seamless cross-subdomain SSO (shared secure cookie or equivalent) is a separate security-reviewed step and is not claimed by this endpoint.
- Do not infer membership for Business, Edutech or Enterprise from a successful login. Enrollments and tenant roles must be explicitly granted through an audited workflow.
