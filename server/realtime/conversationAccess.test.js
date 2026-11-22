import test from "node:test";
import assert from "node:assert/strict";
import { isConversationRoomAuthorized } from "./conversationAccess.js";

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
