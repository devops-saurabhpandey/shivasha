import test from "node:test";
import assert from "node:assert/strict";
import {
  GROUP_MEMBER_ROLE,
  GROUP_MEMBER_STATUS,
  GROUP_PRIVACY,
  canManageGroupMembership,
  canManageGroupSettings,
  canModerateGroupContent,
  canPostToGroup,
  canViewGroup,
  isActiveGroupMember
} from "./groupAccessPolicy.js";

const activeMember = { status: GROUP_MEMBER_STATUS.ACTIVE, role: GROUP_MEMBER_ROLE.MEMBER };

test("public groups are viewable without membership but banned users are denied", () => {
  assert.equal(canViewGroup({ privacy: GROUP_PRIVACY.PUBLIC }), true);
  assert.equal(canViewGroup({ privacy: GROUP_PRIVACY.PUBLIC, membership: { status: "banned" } }), false);
});

test("private and invite-only groups require active membership", () => {
  for (const privacy of [GROUP_PRIVACY.PRIVATE, GROUP_PRIVACY.INVITE_ONLY]) {
    assert.equal(canViewGroup({ privacy }), false);
    assert.equal(canViewGroup({ privacy, membership: { status: GROUP_MEMBER_STATUS.PENDING } }), false);
    assert.equal(canViewGroup({ privacy, membership: activeMember }), true);
  }
});

test("unknown privacy and non-active membership fail closed", () => {
  assert.equal(canViewGroup({ privacy: "unknown", membership: activeMember }), false);
  assert.equal(isActiveGroupMember(null), false);
  assert.equal(isActiveGroupMember({ status: "pending" }), false);
});

test("only active members can post and paused groups reject posts", () => {
  assert.equal(canPostToGroup({ membership: activeMember }), true);
  assert.equal(canPostToGroup({ membership: { status: "pending" } }), false);
  assert.equal(canPostToGroup({ membership: activeMember, groupStatus: "paused" }), false);
});

test("owner and admin manage settings and membership; moderators only moderate content", () => {
  assert.equal(canManageGroupSettings(GROUP_MEMBER_ROLE.OWNER), true);
  assert.equal(canManageGroupSettings(GROUP_MEMBER_ROLE.ADMIN), true);
  assert.equal(canManageGroupSettings(GROUP_MEMBER_ROLE.MODERATOR), false);
  assert.equal(canManageGroupMembership(GROUP_MEMBER_ROLE.MODERATOR), false);
  assert.equal(canModerateGroupContent(GROUP_MEMBER_ROLE.MODERATOR), true);
  assert.equal(canModerateGroupContent(GROUP_MEMBER_ROLE.MEMBER), false);
  assert.equal(canManageGroupSettings("unknown"), false);
});
