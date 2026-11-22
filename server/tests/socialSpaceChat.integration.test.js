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
import SocialSpaceChatMessage from "../models/SocialSpaceChatMessage.js";
import { createSocialSpaceChatRouters } from "../routes/socialSpaceChat.js";

const mongoUri = process.env.MONGODB_TEST_URI;

test("Social group and community chat is active-member-only and respects blocks", {
  skip: !mongoUri && "Set MONGODB_TEST_URI to an isolated MongoDB *_test database"
}, async () => {
  const url = new URL(mongoUri);
  url.pathname = "/shivasha_social_chat_test";
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!databaseName.endsWith("_test")) throw new Error("Refusing to run Social chat integration tests outside an isolated *_test database");
  await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 15000 });
  process.env.JWT_SECRET = "shivasha-social-chat-integration-test-only-secret";
  const app = express();
  app.use(express.json());
  const { groupChatRoutes, communityChatRoutes } = createSocialSpaceChatRouters({ Group, GroupMembership, Community, CommunityMembership });
  app.use("/api/social/groups", groupChatRoutes);
  app.use("/api/social/communities", communityChatRoutes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  try {
    await mongoose.connection.dropDatabase();
    await Promise.all([User.syncIndexes(), Group.syncIndexes(), GroupMembership.syncIndexes(), Community.syncIndexes(), CommunityMembership.syncIndexes(), SocialSpaceChatMessage.syncIndexes()]);
    const [owner, member, outsider] = await Promise.all([
      User.create({ name: "Chat Owner", email: "chat-owner@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Chat Member", email: "chat-member@example.test", passwordHash: "test-hash" }),
      User.create({ name: "Chat Outsider", email: "chat-outsider@example.test", passwordHash: "test-hash" })
    ]);
    const users = [owner, member, outsider];
    const tokens = new Map(users.map(user => [String(user._id), jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: "10m" })]));
    const call = async (user, path, method = "GET", body) => {
      const response = await fetch(baseUrl + path, {
        method,
        headers: { authorization: "Bearer " + tokens.get(String(user._id)), ...(body === undefined ? {} : { "content-type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      return { status: response.status, body: await response.json() };
    };

    const group = await Group.create({ name: "Members Chat", privacy: "private", createdBy: owner._id });
    await GroupMembership.create([
      { groupId: group._id, userId: owner._id, role: "owner", status: "active", joinedAt: new Date() },
      { groupId: group._id, userId: member._id, role: "member", status: "active", joinedAt: new Date() },
      { groupId: group._id, userId: outsider._id, role: "member", status: "pending" }
    ]);
    const path = "/api/social/groups/" + group._id + "/chat/messages";
    assert.equal((await call(outsider, path)).status, 404);
    assert.equal((await call(outsider, path, "POST", { text: "not allowed" })).status, 404);
    assert.equal((await call(member, path, "POST", { text: "   " })).status, 400);
    const sent = await call(member, path, "POST", { text: "Hello group members" });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.text, "Hello group members");
    assert.equal(String(sent.body.senderId._id || sent.body.senderId), String(member._id));
    const ownerFeed = await call(owner, path);
    assert.equal(ownerFeed.status, 200);
    assert.equal(ownerFeed.body.messages.length, 1);
    assert.equal(ownerFeed.body.messages[0].text, "Hello group members");
    assert.equal((await call(owner, "/api/social/groups/" + group._id + "/chat/read", "POST", {})).body.success, true);
    assert.equal((await SocialSpaceChatMessage.findById(sent.body._id)).readBy.some(id => String(id) === String(owner._id)), true);

    await User.updateOne({ _id: owner._id }, { $addToSet: { blockedUsers: member._id } });
    const afterBlock = await call(owner, path);
    assert.equal(afterBlock.body.messages.length, 0);

    const community = await Community.create({ name: "Chat Community", privacy: "private", createdBy: owner._id });
    await CommunityMembership.create([
      { communityId: community._id, userId: owner._id, role: "owner", status: "active", joinedAt: new Date() },
      { communityId: community._id, userId: member._id, role: "member", status: "active", joinedAt: new Date() }
    ]);
    const communityPath = "/api/social/communities/" + community._id + "/chat/messages";
    assert.equal((await call(member, communityPath, "POST", { text: "Community hello" })).status, 201);
    assert.equal(await SocialSpaceChatMessage.countDocuments({ resourceType: "group", resourceId: community._id }), 0);
    assert.equal(await SocialSpaceChatMessage.countDocuments({ resourceType: "community", resourceId: community._id }), 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }
});
