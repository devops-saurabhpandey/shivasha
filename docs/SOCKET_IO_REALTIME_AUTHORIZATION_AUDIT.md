# Socket.IO Realtime Authorization Audit

Audit branch: `architecture/four-app-shared-core`

## Findings

### Conversation rooms — critical authorization gap fixed

Before this change, any authenticated socket could send `conversation:join` with an arbitrary conversation ID. The socket server joined the room without checking that the user was a participant. The typing events also relayed to arbitrary conversation room IDs.

The HTTP message APIs already checked `Conversation.participants`, but that check did not protect the separate Socket.IO room join path.

Changes:
- Socket.IO now loads the conversation from MongoDB using both the supplied conversation ID and the authenticated socket user ID in `participants`.
- The socket joins only when the database confirms participant membership.
- Invalid IDs, lookup failures, missing IDs and oversized IDs fail closed without joining.
- Typing start/stop events are emitted only when the server-side socket room set confirms the socket has joined that exact conversation room.
- A small pure helper and tests cover authorized room membership and malformed/missing input.
- The four-app foundation CI workflow now runs these tests.

### Direct messages

- `/api/messages/conversations` lists only conversations containing the authenticated user.
- Message history, message creation and read receipts each load the conversation with both its ID and authenticated user in participants.
- New messages are emitted to participant-specific `user:<id>` rooms, which are joined from the verified JWT subject at socket connection.
- This audit did not change the HTTP message API or message schema.

### Live rooms

- Live signaling and chat require the sender to have joined the live room.
- Signaling also checks that the target socket is in the same live room.
- Only the host socket can stop its live room.
- Live room discovery and joining are currently public to authenticated SHIVASHA accounts by design; product entitlement, moderation and abuse/rate-limit policies remain follow-up work.

### Presence

- Presence is global across authenticated sockets and broadcasts user IDs. Confirm whether this should be restricted by privacy/follow/friend relationships before product separation is completed.
- Socket authentication currently verifies the JWT but does not re-load the User record or check current moderation status at connection time. HTTP `requireAuth` does re-load the user and checks `moderationBlocked`. Aligning socket authentication with that current-account check is a separate recommended hardening step.

## Four-app boundaries and deferred work

- Shared socket infrastructure is acceptable, but event authorization must be resource-specific and server-side.
- Social conversation room membership is now checked against the conversation's participant list.
- Do not treat a shared login as permission to join arbitrary rooms or read another product's tenant data.
- Add app/product entitlement checks only after a safe membership provisioning and existing-user compatibility plan is approved.
- Review all remaining realtime event names and any future Edutech/Business/Enterprise rooms before introducing product-specific socket namespaces.
- No production DB migration, membership grant, deployment or PR merge was performed.
