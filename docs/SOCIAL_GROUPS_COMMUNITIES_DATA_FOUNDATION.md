# Social Groups and Communities — Data Foundation

Branch: `architecture/four-app-shared-core`

## Domain boundary

Groups and Communities are independent Social domain resources. A Community is not implicitly a parent of Groups; no hierarchy or cross-membership is inferred. Group conversations will be a separate feature from the existing one-to-one direct-message conversation flow.

## Models added

- `SocialGroup` — group identity, description, privacy, lifecycle status, creator and optional cover image URL.
- `SocialGroupMembership` — one user's role and membership lifecycle within one group.
- `SocialCommunity` — community identity, description, privacy, lifecycle status, creator and optional cover image URL.
- `SocialCommunityMembership` — one user's role and membership lifecycle within one community.

Both membership models have a unique compound index for the resource/user pair and a user/status lookup index.

## Initial safe defaults

- Privacy defaults to `private`; public visibility must be explicitly selected.
- New membership defaults to `pending`; no membership is granted by creating an invitation or request.
- Membership states: `pending`, `active`, `removed`, `banned`.
- Roles: `owner`, `admin`, `moderator`, `member`.
- Owner/Admin may manage settings and membership; Moderator may moderate content only; Member has no management privilege.
- Only active members can post to a group. Public visibility does not itself grant posting permission.
- Paused or archived groups do not accept new posts.
- Unknown privacy, role or status values fail closed in the policy helpers.

## Authorization and compatibility

- Added `server/social/groupAccessPolicy.js` with pure authorization decisions and unit tests.
- Existing one-to-one `Conversation` and `Message` models/routes are unchanged. Multi-member group messaging must use a separate group conversation design and must authorize every HTTP and Socket.IO operation against current membership.
- Existing block relationships must be checked on membership requests, invitations, content visibility and realtime interactions. Shared-community behavior for users who block one another needs explicit product policy before exposing shared member lists or content.
- Presence visibility policy remains unchanged pending an explicit product decision.
- The existing ProductMembership and Enterprise CompanyMembership authorization systems are not reused as Social membership.

## Not included yet

No Groups/Communities HTTP routes, UI, invitation delivery, group chat, content model, notification type, data migration, production index creation, deployment or merge is included in this data-foundation step. The new models are additive and have not been connected to production requests.

## Next implementation gates

1. Add route-level authorization helpers and tests before exposing create/read/update/join/leave/invite endpoints.
2. Define safe membership transitions, owner transfer and last-owner protection.
3. Define how blocks affect shared groups/communities before returning member lists or content.
4. Add separate group conversation and Socket.IO membership checks before group chat.
5. Add UI only after the APIs and authorization tests are stable.
