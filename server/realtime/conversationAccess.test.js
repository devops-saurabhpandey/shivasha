import test from "node:test";
import assert from "node:assert/strict";
import { isConversationRoomAuthorized, isConversationPeerBlocked } from "./conversationAccess.js";

test("allows realtime events only for a room the server joined", () => {
  const socket = { rooms: new Set(["socket-1", "conversation:abc123"]) };
  assert.equal(isConversationRoomAuthorized(socket, "abc123"), true);
  assert.equal(isConversationRoomAuthorized(socket, "other"), false);
});

test("fails closed for missing, malformed, or oversized conversation IDs", () => {
  const socket = { rooms: new Set(["conversation:undefined", "conversation:[object Object]"]) };
  assert.equal(isConversationRoomAuthorized(socket, undefined), false);
  assert.equal(isConversationRoomAuthorized(socket, null), false);
  assert.equal(isConversationRoomAuthorized(socket, ""), false);
  assert.equal(isConversationRoomAuthorized(socket, "   "), false);
  assert.equal(isConversationRoomAuthorized(socket, "x".repeat(65)), false);
  assert.equal(isConversationRoomAuthorized(socket, {}), false);
});

test("fails closed when socket room state is unavailable", () => {
  assert.equal(isConversationRoomAuthorized(null, "abc"), false);
  assert.equal(isConversationRoomAuthorized({}, "abc"), false);
});

test("realtime access is denied when either conversation participant has blocked the other", async () => {
  const users = {
    me: { blockedUsers: ["peer"] },
    peer: { blockedUsers: [] }
  };
  const findUser = async id => users[id] || null;
  assert.equal(await isConversationPeerBlocked({ participantIds: ["me", "peer"], userId: "me", findUser }), true);
  users.me.blockedUsers = [];
  users.peer.blockedUsers = ["me"];
  assert.equal(await isConversationPeerBlocked({ participantIds: ["me", "peer"], userId: "me", findUser }), true);
  users.peer.blockedUsers = [];
  assert.equal(await isConversationPeerBlocked({ participantIds: ["me", "peer"], userId: "me", findUser }), false);
});

test("realtime block authorization fails closed for invalid membership or missing users", async () => {
  const findUser = async id => id === "me" ? { blockedUsers: [] } : null;
  assert.equal(await isConversationPeerBlocked({ participantIds: ["me"], userId: "me", findUser }), true);
  assert.equal(await isConversationPeerBlocked({ participantIds: ["other", "peer"], userId: "me", findUser }), true);
  assert.equal(await isConversationPeerBlocked({ participantIds: ["me", "peer"], userId: "me", findUser }), true);
});
