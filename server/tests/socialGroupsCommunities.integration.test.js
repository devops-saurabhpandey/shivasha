import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Group from "../models/Group.js";
import GroupMembership from "../models/GroupMembership.js";
import Community from "../models/Community.js";
import CommunityMembership from "../models/CommunityMembership.js";
import SocialInvite from "../models/SocialInvite.js";
import { groupRoutes, communityRoutes } from "../routes/socialGroupsCommunities.js";
import { hashSocialInviteToken } from "../social/socialInvitePolicy.js";

const mongoUri = process.env.MONGODB_TEST_URI;

test("Social group and community routes enforce member visibility and one-time invitations", {
  skip: !mongoUri && "Set MONGODB_TEST_URI to an isolated MongoDB *_test database"
}, async () => {
  const url = new URL(mongoUri);
  url.pathname = "/shivasha_social_test";
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!databaseName.endsWith("_test")) throw new Error("Refusing to run Social integration tests outside an isolated *_test database");
  await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 15000 });
  process.env.JWT_SECRET = "shivasha-social-integration-test-only-secret";
  const app = express();
  app.use(express.json());
  app.use("/api/social/groups", groupRoutes);
  app.use("/api/social/communities", communityRoutes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = "http://127.0.0.1:" + server.address().port;

  try {
    await mongoose.connection.dropDatabase();
    await Promise.all([
      User.syncIndexes(), Group.syncIndexes(), GroupMembership.syncIndexes(),
      Community.syncIndexes(), CommunityMembership.syncIndexes(), SocialInvite.syncIndexes()
    ]);
    const [owner, invited, outsider] = await Promise.all([
      User.create({ name: "Group Owner", email: "group-owner@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Invited Member", email: "invited-member@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Outsider", email: "outsider@example.test", passwordHash: "test-hash" })
    ]);
    const users = [owner, invited, outsider];
    const tokens = new Map(users.map(user => [String(user._id), jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "10m" })]));
    const call = async (user, path, method = "GET", body) => {
      const response = await fetch(baseUrl + path, {
        method,
        headers: {
          authorization: "Bearer " + tokens.get(String(user._id)),
          ...(body === undefined ? {} : { "content-type": "application/json" })
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      return { status: response.status, body: await response.json() };
    };

    const group = await Group.create({ name: "Secure Group", privacy: "invite-only", createdBy: owner._id });
    await GroupMembership.create({ groupId: group._id, userId: owner._id, role: "owner", status: "active", joinedAt: new Date() });
    assert.equal((await call(outsider, "/api/social/groups/" + group._id)).status, 404);
    assert.equal((await call(outsider, "/api/social/groups/" + group._id + "/members")).status, 404);

    const issued = await call(owner, "/api/social/groups/" + group._id + "/invitations", "POST", {});
    assert.equal(issued.status, 201);
    const rawToken = issued.body.invitation.token;
    const invite = await SocialInvite.findById(issued.body.invitation.id).select("+tokenHash").lean();
    assert.equal(invite.tokenHash, hashSocialInviteToken(rawToken));
    assert.notEqual(invite.tokenHash, rawToken);
    assert.equal(invite.status, "pending");

    const redeemed = await call(invited, "/api/social/groups/invitations/redeem", "POST", { token: rawToken });
    assert.equal(redeemed.status, 200, JSON.stringify(redeemed.body));
    assert.equal(redeemed.body.membershipStatus, "active");
    assert.equal((await SocialInvite.findById(invite._id)).status, "redeemed");
    assert.equal((await call(outsider, "/api/social/groups/invitations/redeem", "POST", { token: rawToken })).status, 404);

    const members = await call(invited, "/api/social/groups/" + group._id + "/members");
    assert.equal(members.status, 200);
    assert.equal(members.body.members.length, 2);
    assert.equal(members.body.members.some(item => item.user.id === String(owner._id)), true);
    assert.equal(members.body.members.some(item => item.user.id === String(invited._id)), true);
    assert.equal((await call(invited, "/api/social/groups/" + group._id + "/members?status=pending")).status, 403);

    const community = await Community.create({ name: "Separate Community", privacy: "private", createdBy: owner._id });
    await CommunityMembership.create({ communityId: community._id, userId: owner._id, role: "owner", status: "active", joinedAt: new Date() });
    const communityInvite = await call(owner, "/api/social/communities/" + community._id + "/invitations", "POST", {});
    assert.equal(communityInvite.status, 201);
    assert.equal((await call(invited, "/api/social/communities/invitations/redeem", "POST", { token: communityInvite.body.invitation.token })).status, 200);
    assert.equal(await GroupMembership.countDocuments({ groupId: community._id }), 0);
    assert.equal(await CommunityMembership.countDocuments({ communityId: community._id, userId: invited._id, status: "active" }), 1);

    // A member cannot issue an invitation or inspect pending requests.
    assert.equal((await call(invited, "/api/social/groups/" + group._id + "/invitations", "POST", {})).status, 404);
    // Block relationships suppress each other's identities from the member list.
    await User.updateOne({ _id: owner._id }, { $addToSet: { blockedUsers: invited._id } });
    const filtered = await call(owner, "/api/social/groups/" + group._id + "/members");
    assert.equal(filtered.body.members.some(item => item.user.id === String(invited._id)), false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }
});
