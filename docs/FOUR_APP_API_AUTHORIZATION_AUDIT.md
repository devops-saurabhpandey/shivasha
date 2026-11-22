# Four-Application API Authorization Audit

Audit branch: `architecture/four-app-shared-core`

This is a source-code audit of representative Social, Business, Edutech and Enterprise API routes. It is not a penetration test and does not claim every route or every data model has been exhaustively verified.

## Social

### Changes implemented on this branch
- Extended mutual-block filtering to Social Discover, user search, Business Directory, profile connections, and notification feeds/unread counts. Public user projections use an explicit profile-field allowlist and omit email, password hashes, moderation state, saved posts and private block lists.
- Direct-message conversation lists now omit a conversation when either participant has blocked the other. Creating a conversation and reading, sending, or marking messages read are denied with 404 when either-direction blocking exists.
- Added a mutual-block policy: a post is hidden when the viewer blocked its author or the author blocked the viewer.
- Applied this policy to feed and hashtag reads, direct post reads, saved-post reads, and post save/repost/comment/reply/like actions. Blocked interactions return 404 to avoid confirming inaccessible content.
- Applied mutual-block checks to profile reads and follow actions. Block lists are excluded from public user projections.
- Added unit tests for both-direction block filtering and fail-closed missing viewer identity.
- Removed author email from populated post payloads; feed, comments and reposts now expose only name, bio and avatar for the author.
- Post deletion now reloads the requester's current database role before applying the admin/manager override, rather than trusting a potentially stale JWT role claim.
- Added a pure authorization helper and regression tests for owner, admin, manager, ordinary user and missing-identity cases.
- Added the regression tests to the four-app foundation CI workflow.

### Controls observed
- Post creation, feed, comments, replies, likes, saves and reposts require authentication.
- Saved posts are loaded from the authenticated user's `savedPosts` list.
- Post ownership is checked for deletion, with an additional admin/manager override.
- User block lists exist, but the reviewed post feed/comment/like paths do not consistently enforce block relationships.
- The feed and post-by-ID endpoints return posts to any authenticated user; no post visibility/follower-only policy is applied in these routes.

### Findings / follow-up
1. Continue auditing Socket.IO conversation-room joins and typing events after a block is added, plus global presence broadcasts. Ensure already-open rooms are invalidated or rechecked when either participant blocks the other. Confirm expected privacy semantics before enabling follower-only/private profiles.
2. Feed, post-by-ID, comments and interactions do not consistently enforce blocked-user relationships or visibility settings. Define the Social visibility model and enforce it on read and write paths.
3. Post deletion now checks the current database role. Continue reviewing other destructive Social actions for stale JWT role or permission claims.
4. Image upload validates declared MIME type, not file signatures. Add actual file-type inspection and quotas before production hardening.

## Business

### Controls observed
- `/api/business` applies `requireAuth` router-wide.
- Leads, products, orders and MIS queries are scoped to `owner: req.user.id`.
- Lead update/delete filters include both record ID and owner.
- Product deletion is owner-scoped.
- Order creation requires an active product owned by the same user, and the created order is assigned to that owner.
- Software enquiries are scoped to the submitting customer.

### Findings / follow-up
1. The current Business CRM is single-user-owned, not yet a multi-member business tenant. Do not assume a company member can access another owner's CRM records.
2. ProductMembership is not wired into these routes. This is intentional until existing users are safely provisioned; adding guards without a migration would lock out current accounts.
3. Validate object IDs and add request quotas / abuse controls consistently across write endpoints.

## Edutech

### Controls observed
- Student quiz attempts are created with `student: req.user.id`; attempt list, review and delete are scoped to that same student.
- Student profile and study plan reads/writes are scoped to the authenticated student.
- Published questions are returned without `answerIndex`; draft/admin question operations re-check the user's current database role.
- Guardian access is student-controlled: short-lived hashed invite, guardian redemption, explicit student approval, and approved-link-only child progress reads.
- Guardian progress queries use the approved guardian's own ID to select linked students.

### Findings / follow-up
1. Public question catalogue endpoints are available to any authenticated account; confirm whether product enrollment or age/guardian policy is required.
2. Quiz answers are returned to the student immediately after submitting an attempt, which is expected for self-review; ensure no attempt endpoint can be queried by another student's ID.
3. Add explicit tests for guardian invite expiry, one-time redemption, student approval/revocation, cross-student access denial, and concurrent redemption.
4. Define child-account age/consent, guardian identity verification, retention and deletion requirements before production launch.

## Enterprise

### Controls observed
- Enterprise routes require authentication.
- Company listing is based on active CompanyMembership records for the current user.
- Company detail, profile changes, member management and audit events use database-loaded CompanyMembership and a permission helper.
- HR routes use a selected company context, active membership and company-scoped record filters; reviewed employee, attendance, leave and payroll queries include `companyId: req.companyId`.
- Company role permissions are defined centrally in `enterprise/companyConfig.js`.

### Findings / follow-up
1. Company membership is the authoritative Enterprise access source. Keep it distinct from the new ProductMembership model unless an explicit migration plan is approved.
2. HR route coverage should be tested for every endpoint and every role, especially payroll approve/release separation and cross-company ID substitution.
3. Review role assignment policy: a user with member-management permission may assign most non-owner roles; company-admin assignment is restricted to the owner. Confirm this is the intended delegation model.
4. Audit events should be checked for complete coverage of sensitive changes and reliable delivery/retention.

## Cross-product access boundary

- Four separate portal entry points and a product registry are currently descriptive routing metadata, not authorization.
- Existing authentication is shared, but it must not grant access to another product's data.
- ProductMembership middleware exists but is not mounted on existing routes.
- Existing owner-scoped Business records and CompanyMembership-scoped Enterprise records must remain protected by their current ownership/tenant checks during migration.
- No cross-product route guard, membership migration, membership grant, production database index build, deployment or merge was performed by this audit.

## Recommended next implementation order

1. Add regression tests for Social privacy/blocked-user behavior and remove unnecessary email exposure from feed payloads after confirming frontend dependencies.
2. Replace JWT role-based destructive overrides with fresh database authorization.
3. Add route-level cross-owner and cross-company negative tests for Business and Enterprise.
4. Add Edutech guardian lifecycle and cross-student tests.
5. Agree safe ProductMembership provisioning, then introduce product guards incrementally behind compatibility tests.
