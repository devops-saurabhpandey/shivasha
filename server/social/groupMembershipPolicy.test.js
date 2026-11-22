import test from "node:test";
import assert from "node:assert/strict";
import { GROUP_MEMBER_ROLE, GROUP_MEMBER_STATUS, GROUP_PRIVACY } from "./groupAccessPolicy.js";
import {
  canRequestGroupMembership,
  canReviewGroupMembership,
  getGroupMembershipTransition
} from "./groupMembershipPolicy.js";

test("membership requests are pending candidates, never immediate access grants", () => {
  assert.equal(canRequestGroupMembership({ privacy: GROUP_PRIVACY.PUBLIC }), true);
  assert.equal(canRequestGroupMembership({ privacy: GROUP_PRIVACY.PRIVATE }), true);
  assert.equal(canRequestGroupMembership({ privacy: GROUP_PRIVACY.INVITE_ONLY }), false);
  assert.equal(canRequestGroupMembership({ privacy: GROUP_PRIVACY.INVITE_ONLY, hasValidInvite: true }), true);
});

test("blocks, banned users and duplicate active or pending memberships cannot request", () => {
  assert.equal(canRequestGroupMembership({ privacy: GROUP_PRIVACY.PUBLIC, isBlocked: true }), false);
  assert.equal(canRequestGroupMembership({ privacy: GROUP_PRIVACY.PUBLIC, existingMembership: { status: "banned" } }), false);
  assert.equal(canRequestGroupMembership({ privacy: GROUP_PRIVACY.PUBLIC, existingMembership: { status: "active" } }), false);
  assert.equal(canRequestGroupMembership({ privacy: GROUP_PRIVACY.PUBLIC, existingMembership: { status: "pending" } }), false);
});

test("only owner and admin can review non-owner membership records", () => {
  const pending = { role: GROUP_MEMBER_ROLE.MEMBER, status: GROUP_MEMBER_STATUS.PENDING };
  assert.equal(canReviewGroupMembership({ actorRole: GROUP_MEMBER_ROLE.OWNER, targetMembership: pending, action: "approve" }), true);
  assert.equal(canReviewGroupMembership({ actorRole: GROUP_MEMBER_ROLE.ADMIN, targetMembership: pending, action: "reject" }), true);
  assert.equal(canReviewGroupMembership({ actorRole: GROUP_MEMBER_ROLE.MODERATOR, targetMembership: pending, action: "approve" }), false);
  assert.equal(canReviewGroupMembership({ actorRole: GROUP_MEMBER_ROLE.ADMIN, targetMembership: { ...pending, role: GROUP_MEMBER_ROLE.ADMIN }, action: "remove" }), false);
  assert.equal(canReviewGroupMembership({ actorRole: GROUP_MEMBER_ROLE.OWNER, targetMembership: { ...pending, role: GROUP_MEMBER_ROLE.ADMIN }, action: "remove" }), true);
  assert.equal(canReviewGroupMembership({ actorRole: GROUP_MEMBER_ROLE.MEMBER, targetMembership: pending, action: "approve" }), false);
  assert.equal(canReviewGroupMembership({ actorRole: GROUP_MEMBER_ROLE.OWNER, targetMembership: { ...pending, role: "owner" }, action: "remove" }), false);
});

test("membership review actions are restricted to valid lifecycle states", () => {
  assert.equal(canReviewGroupMembership({ actorRole: "admin", targetMembership: { role: "member", status: "active" }, action: "approve" }), false);
  assert.equal(canReviewGroupMembership({ actorRole: "admin", targetMembership: { role: "member", status: "pending" }, action: "ban" }), false);
  assert.equal(canReviewGroupMembership({ actorRole: "admin", targetMembership: { role: "member", status: "active" }, action: "ban" }), true);
});

test("transitions set status and joinedAt consistently", () => {
  const now = new Date("2026-11-22T00:00:00.000Z");
  assert.deepEqual(getGroupMembershipTransition("approve", now), { status: "active", joinedAt: now });
  assert.deepEqual(getGroupMembershipTransition("reject", now), { status: "removed", joinedAt: null });
  assert.deepEqual(getGroupMembershipTransition("remove", now), { status: "removed", joinedAt: null });
  assert.deepEqual(getGroupMembershipTransition("ban", now), { status: "banned", joinedAt: null });
  assert.throws(() => getGroupMembershipTransition("promote", now), /Unsupported/);
  assert.throws(() => getGroupMembershipTransition("approve", "invalid"), /valid transition date/);
});
