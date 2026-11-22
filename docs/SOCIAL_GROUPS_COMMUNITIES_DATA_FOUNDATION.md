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
- Added `server/social/groupMembershipPolicy.js` to gate requests, restrict review actions to Owner/Admin, protect the Owner record, and define pending/active/removed/banned transitions. These are pure policy helpers; HTTP routes still need to re-check current database state.
- Existing one-to-one `Conversation` and `Message` models/routes are unchanged. Multi-member group messaging must use a separate group conversation design and must authorize every HTTP and Socket.IO operation against current membership.
- Existing block relationships must be checked on membership requests, invitations, content visibility and realtime interactions. Shared-community behavior for users who block one another needs explicit product policy before exposing shared member lists or content.
- Presence visibility policy remains unchanged pending an explicit product decision.
- The existing ProductMembership and Enterprise CompanyMembership authorization systems are not reused as Social membership.

## API foundation added

Mounted authenticated endpoints:

- `/api/social/groups`
- `/api/social/communities`

Initial endpoints on each resource:

- `GET /` — list active public resources and resources where the viewer is an active member; omit owners blocked in either direction and resources where the viewer is banned.
- `POST /` — create a private-by-default resource and create its active Owner membership.
- `GET /:id` — return a public resource or a private resource only to an active member; banned members and blocked creator/viewer pairs receive not-found.
- `POST /:id/join` — submit a pending membership request. Invite-only requests require an invitation token.
- `POST /:id/leave` — leave as a non-owner active member. Owner must transfer ownership first.
- `GET /:id/members` — active members only; pending requests are visible only to Owner/Admin. Returned user fields are allowlisted and blocked peers are excluded.
- `POST /:id/members/:userId/review` — Owner/Admin can approve/reject pending requests and remove/ban active members. Owner records are protected; Admin cannot moderate another Admin.
- `POST /:id/invitations` — active Owner/Admin can issue a random 256-bit invitation token. Only SHA-256 hash is stored; raw token is returned once.
- `POST /invitations/redeem` — authenticated user redeems a pending, unexpired token. Conditional atomic claim ensures one-time use; existing pending join requests may be upgraded to active. Banned memberships cannot be reactivated; an existing pending request can be upgraded, and a removed non-owner can rejoin only with a fresh valid invitation. Already-active members cannot redeem another invite.
- `POST /:id/invitations/:inviteId/revoke` — Owner/Admin can revoke a pending invitation.

Group and Community invitation records share a strict model but carry an explicit resource type, resource ID and unique token hash. Expiry is 24 hours; a TTL index is cleanup only, while every redemption checks expiry in its query. If membership creation fails after an invite claim, the invite is conditionally restored only for that exact redeemer/claim timestamp.

Existing one-to-one Messages and Socket.IO rooms remain unchanged. Group member lists are available only to active members; public visibility alone does not expose a member directory.

## Not included yet

No email/SMS delivery, group chat, realtime event, notification type, data migration, production index creation, deployment or merge is included. Invitations are manually shareable tokens; the platform does not send them automatically.

## Next implementation gates

1. Add owner transfer and last-owner protection before any owner-role mutation.
2. Define how blocks affect shared group posts/content; member-list visibility currently excludes blocked peers.
3. Add group post/content model and membership-scoped read/write/moderation endpoints.
4. Add separate group conversation and Socket.IO membership checks before group chat.
5. Build the Social Groups & Communities frontend against the scoped content APIs.


## Group and Community content API — first text-post slice

A separate SocialSpacePost model and dedicated Group/Community post routes are added. Each post records an explicit resource type and ID, so Group content cannot be read through a Community route or vice versa.

- Public resource posts can be read by authenticated users; private and invite-only posts require active membership. Paused/archived resources and banned memberships fail closed.
- Only active members of an active resource can publish, like or comment.
- Authors can edit their own posts. Authors and active Owner/Admin/Moderator members can delete posts.
- Post and comment text is length-limited and validated. Populated author/comment/reply data is restricted to name and avatar.
- Reads and interactions exclude or reject users blocked in either direction. Resource creators are also checked against the viewer's current block state.
- Existing global Social feed and one-to-one Messages remain separate and unchanged.

Text posts and secure Photo/Video attachments are supported by the API. There is no group chat, realtime event, content notification, frontend UI, migration, production index creation, deployment or merge in this slice.


## Social Groups & Communities frontend

The authenticated Social sidebar now includes a Groups & Communities workspace. It supports switching between Groups and Communities, listing accessible spaces, creating a space with public/private/invite-only privacy, redeeming an invitation token, requesting to join, reading the selected space's posts, publishing text and up to four photo/video attachments, liking posts and adding comments.

The frontend uses the existing authenticated API token and the dedicated resource-scoped endpoints. Uploads use multipart FormData and do not set a JSON Content-Type header. Private content visibility and all write permissions remain enforced by the backend; hiding controls in the frontend is not treated as authorization.

This UI does not yet provide member approval/moderation dashboards, invitation issuance/revocation UI, post editing/deletion controls, group chat, or realtime content updates. Those are separate follow-up slices.


## Owner/Admin frontend controls

The Groups & Communities workspace includes a management panel for active Owner/Admin members. It loads active members and pending requests through the member-list API, allows permitted approvals/rejections and remove/ban actions, and issues one-time invitation tokens with copy and revoke controls. The UI suppresses moderation controls for Owner accounts and prevents Admin users from seeing moderation actions against peer Admins; backend policy remains the final authorization boundary.

Invitation tokens are displayed once and expire after 24 hours. The UI does not expose a token history because the API intentionally does not return raw tokens after issuance.


## Separate Group & Community chat

Group Chat and Community Chat use a dedicated `SocialSpaceChatMessage` collection and resource-scoped endpoints:
- `GET /api/social/groups/:id/chat/messages` and `POST /api/social/groups/:id/chat/messages`
- `GET /api/social/communities/:id/chat/messages` and `POST /api/social/communities/:id/chat/messages`
- `POST /api/social/{groups|communities}/:id/chat/read`

Every request re-loads the resource and the current user's active membership from MongoDB. Pending, removed, banned, non-member, inactive-resource and missing-resource users fail closed. Message history is limited to the latest 100 messages; message text is limited to 2,000 characters. Read state is recorded per member.

Messages from either-direction blocked peers are excluded from history. Realtime delivery uses authenticated per-user Socket.IO rooms and only sends to currently active members who are not blocked in either direction. This chat is distinct from existing one-to-one conversations and messages.

The Social Groups & Communities UI now shows the selected space's chat to active members, supports sending text messages, refreshes history and listens for scoped realtime message events. Group and Community chat histories are isolated by resource type and ID.


## Chat message removal and account moderation

- Chat authors may remove their own messages. Active Owner/Admin/Moderator members may also remove messages in their space.
- Removal is a soft-delete: the message remains as an audit placeholder ("This message was removed") with deletion time and actor ID; the original text is not returned by subsequent reads.
- Removal is scoped to the exact Group/Community resource and message ID. Unauthorized users cannot use a message ID to inspect or delete another space's message.
- Deletion events are sent to active members through authenticated per-user Socket.IO rooms, applying the same two-way block filter as new-message delivery.
- Suspended/moderation-blocked accounts cannot read or send chat messages, even if an old membership record remains active.


## Group and Community post moderation controls

The Social Groups & Communities post feed now exposes the existing scoped post APIs: authors can edit their own text posts, and authors plus active Owner/Admin/Moderator members can delete posts. The UI only displays controls as a convenience; the backend re-checks active membership, exact resource scope, authorship and moderator role for every request. Post deletion currently uses the existing hard-delete endpoint, so the confirmation explicitly warns that it cannot be undone. Moderators can delete posts but cannot edit another member's post. Comments are currently readable and addable but do not yet have edit/delete moderation controls.
