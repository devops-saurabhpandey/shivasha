import test from "node:test";
import assert from "node:assert/strict";
import {
  SOCIAL_INVITE_TTL_MS,
  createSocialInviteToken,
  hashSocialInviteToken,
  getSocialInviteExpiry,
  buildPendingSocialInviteFilter,
  buildSocialInviteClaimUpdate,
  buildSocialInviteRollbackFilter,
  canIssueSocialInvite
} from "./socialInvitePolicy.js";

const now = new Date("2026-11-22T12:00:00.000Z");

test("social invite token is random, URL-safe, and only its hash is persisted", () => {
  const first = createSocialInviteToken();
  const second = createSocialInviteToken();
  assert.equal(typeof first.token, "string");
  assert.match(first.token, /^[A-Za-z0-9_-]+$/);
  assert.equal(first.token.length >= 32, true);
  assert.equal(first.tokenHash, hashSocialInviteToken(first.token));
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.tokenHash, first.token);
});

test("token hashing rejects malformed and oversized tokens", () => {
  assert.throws(() => hashSocialInviteToken("short"), /Invalid invitation token/);
  assert.throws(() => hashSocialInviteToken("x".repeat(257)), /Invalid invitation token/);
});

test("invitation expiry is 24 hours and pending lookup excludes expired or used codes", () => {
  assert.equal(getSocialInviteExpiry(now).getTime(), now.getTime() + SOCIAL_INVITE_TTL_MS);
  assert.deepEqual(buildPendingSocialInviteFilter("hash", now), {
    tokenHash: "hash", status: "pending", expiresAt: { $gt: now }
  });
});

test("invite claim is conditional and rollback is scoped to the exact redeemer", () => {
  assert.deepEqual(buildSocialInviteClaimUpdate("user-1", now), {
    $set: { status: "redeemed", redeemedBy: "user-1", redeemedAt: now }
  });
  assert.deepEqual(buildSocialInviteRollbackFilter("invite-1", "user-1", now), {
    _id: "invite-1", status: "redeemed", redeemedBy: "user-1", redeemedAt: now
  });
});

test("only active Owner/Admin can issue invitations", () => {
  assert.equal(canIssueSocialInvite({ resourceStatus: "active", actorRole: "owner" }), true);
  assert.equal(canIssueSocialInvite({ resourceStatus: "active", actorRole: "admin" }), true);
  assert.equal(canIssueSocialInvite({ resourceStatus: "active", actorRole: "moderator" }), false);
  assert.equal(canIssueSocialInvite({ resourceStatus: "paused", actorRole: "owner" }), false);
});
