# Live Video and Presence Security Audit

Audit branch: `architecture/four-app-shared-core`

## Live Video HTTP storage

- Listing is scoped to `owner: req.user.id`.
- Deletion looks up both the video ID and authenticated owner.
- Upload and delete require HTTP `requireAuth`.
- Upload has one-file and 150 MB limits and an allowlist of declared video MIME types.
- Follow-up hardening: declared MIME type is not proof of actual file content. Add file-signature/container validation and upload quotas before treating this as production-grade media validation.
- Cloudinary URLs are stored as public secure URLs. Confirm expected privacy/access semantics before supporting private or paid video libraries.

## Live Video Socket.IO rooms

- `live:start` creates a room owned by the authenticated socket user.
- `live:stop` checks the host socket ID before stopping a room.
- `live:join`, `live:chat`, reactions and signaling require an existing room and joined room membership.
- Signaling target must already be in the same Socket.IO room.
- Remaining risks: no explicit per-user room creation/join rate limit, room capacity limit, moderation/block check between participants, or persistence/ownership transfer. Live rooms are ephemeral and currently discoverable/joinable by all authenticated accounts. Decide whether public-by-default is intended before adding invite/private-room modes.

## Presence privacy finding

- Current `presence:list` and `presence:online/offline` events are global to all authenticated sockets and expose user IDs.
- This is broader than a contacts-only privacy model. Do not silently change it without deciding the intended Social app presence policy.
- Recommended policy decision: define whether presence is visible to followers, mutual connections, approved contacts, or everyone; respect blocks and user privacy settings; send only the minimum user identifier needed by the client.
- No presence broadcast behavior was changed in this patch.

## Socket account lifecycle gap fixed

Before this patch, Socket.IO verified JWT signature and expiry only. Unlike HTTP `requireAuth`, it did not re-check whether the account still existed or was moderation-blocked.

Changes:
- Socket handshake now re-loads the user by the JWT subject and checks `moderationBlocked`, matching HTTP `requireAuth`.
- Deleted accounts and blocked accounts cannot open new realtime connections.
- Database lookup failures fail closed.
- Extracted the policy into `server/realtime/socketAuthentication.js` and added tests for missing credentials, invalid tokens, deleted/blocked accounts, normalized user ID and database failure.
- The four-app foundation CI workflow runs the new tests.

## Four-app boundary

The shared socket server remains infrastructure only. A shared login does not grant access to arbitrary conversation, company, course, order or project rooms. Each future product-specific room must verify the authenticated user's server-side relationship to that resource before joining or receiving events.

## Safety boundary

No production deployment, database migration, product membership grants, Cloudinary configuration, media deletion, or presence behavior change was made.
