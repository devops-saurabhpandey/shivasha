import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Group from "./Group.js";
import GroupMembership from "./GroupMembership.js";
import Community from "./Community.js";
import CommunityMembership from "./CommunityMembership.js";

const objectId = () => new mongoose.Types.ObjectId();

test("Group and Community are separate domain models with private-by-default visibility", () => {
  const group = new Group({ name: "Study circle", createdBy: objectId() });
  const community = new Community({ name: "Learning community", createdBy: objectId() });
  assert.equal(group.privacy, "private");
  assert.equal(community.privacy, "private");
  assert.equal(group.status, "active");
  assert.equal(community.status, "active");
  assert.equal(Group.modelName, "SocialGroup");
  assert.equal(Community.modelName, "SocialCommunity");
});

test("membership records are separate and pending by default", () => {
  const groupMembership = new GroupMembership({ groupId: objectId(), userId: objectId() });
  const communityMembership = new CommunityMembership({ communityId: objectId(), userId: objectId() });
  assert.equal(groupMembership.status, "pending");
  assert.equal(communityMembership.status, "pending");
  assert.equal(groupMembership.role, "member");
  assert.equal(communityMembership.role, "member");
});

test("membership schemas enforce unique membership per group or community and user", () => {
  for (const Model of [GroupMembership, CommunityMembership]) {
    const indexes = Model.schema.indexes();
    assert.ok(indexes.some(([keys, options]) => options.unique === true &&
      Object.keys(keys).length === 2 &&
      Object.values(keys).includes(1)));
  }
});

test("membership schemas restrict roles and lifecycle statuses", () => {
  for (const Model of [GroupMembership, CommunityMembership]) {
    const role = Model.schema.path("role");
    const status = Model.schema.path("status");
    assert.deepEqual(role.enumValues, ["owner", "admin", "moderator", "member"]);
    assert.deepEqual(status.enumValues, ["pending", "active", "removed", "banned"]);
  }
});

test("unknown fields are rejected to avoid silently accepting unreviewed authorization data", async () => {
  const membership = new GroupMembership({
    groupId: objectId(), userId: objectId(), unexpectedPermission: "all"
  });
  await assert.rejects(() => membership.validate(), /unexpectedPermission/);
});

test("required group and community names and creators are validated", async () => {
  await assert.rejects(() => new Group({}).validate());
  await assert.rejects(() => new Community({}).validate());
});
