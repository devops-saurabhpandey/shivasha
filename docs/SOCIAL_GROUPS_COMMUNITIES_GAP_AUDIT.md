# Social Groups, Communities and Group Messaging — Gap Audit

**Branch:** `architecture/four-app-shared-core`  
**Audit basis:** repository route, model, frontend and Socket.IO inspection  
**Status:** discovery only; no group/community feature or data migration was added

## Confirmed current state

- The Social frontend has a Home/Community feed, people discovery, profiles, posts, comments, follows, saved posts and direct messages.
- `server/routes/messages.js` supports one-to-one conversations: creation requires exactly two participants and message/read handlers identify one other participant.
- `Conversation` stores an array of participants, but the route behavior and UI assume a single peer. The array shape alone does not establish supported group chat.
- No dedicated Group, Community, GroupMembership or CommunityMembership model or corresponding REST route was found in the inspected `server/models` and `server/routes` directories.
- The frontend has no dedicated group/community creation, membership, moderation or group-chat screens in the current navigation.
- Existing Socket.IO conversation authorization is for authenticated conversation participants and must be re-designed/tested for group membership before group rooms are introduced.

## Important compatibility and security constraints

1. Do not repurpose one-to-one direct-message routes as group messaging. Keep current direct messages compatible.
2. Introduce explicit group/community records and membership records. Every read, write, invite, moderation and Socket.IO room action must verify current active membership server-side.
3. Define public, private and invite-only visibility; owner/admin/moderator/member roles; join approval; invitation expiry/revocation; member removal and ownership transfer.
4. For private communities, prevent content, member lists, search results, notifications and previews from leaking to non-members.
5. Apply blocks consistently to direct interactions and invitations. A block must not silently remove a user's lawful access to a shared community; define the exact shared-group behavior before implementation.
6. Add rate limits, spam/report flows, moderation audit events and safe media validation for group posts and uploads.
7. Use tenant/community-scoped database filters and negative tests for cross-community ID substitution.
8. Keep global presence visibility unchanged until the product owner explicitly selects a policy.

## Recommended implementation sequence

1. Approve product behavior and role/visibility rules.
2. Add Group and GroupMembership schemas with indexes and unit tests.
3. Add create/list/detail/join/leave/invite/approve/remove/moderate routes with route-level authorization tests.
4. Add group posts/discussion only after membership checks are established.
5. Add group messaging as a separate conversation type with membership checks on every REST and Socket.IO event.
6. Add frontend navigation and screens, then end-to-end tests for each privacy mode and role.
7. Document retention, reporting, child-safety and account-deletion behavior before production release.

## Explicitly not done

No production data changes, group migrations, new group APIs, Socket.IO group rooms, frontend screens, presence-policy changes, deployment or PR merge were performed by this audit.
