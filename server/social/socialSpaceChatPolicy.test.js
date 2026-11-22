import test from "node:test";
import assert from "node:assert/strict";
import { canDeleteSpaceChatMessage } from "./socialSpaceChatPolicy.js";

test("chat authors can delete their own messages", () => {
  assert.equal(canDeleteSpaceChatMessage({ senderId: "a", requesterId: "a", requesterRole: "member" }), true);
  assert.equal(canDeleteSpaceChatMessage({ senderId: "a", requesterId: "b", requesterRole: "member" }), false);
});

test("owner admin and moderator can moderate other members' chat messages", () => {
  for (const requesterRole of ["owner", "admin", "moderator"]) {
    assert.equal(canDeleteSpaceChatMessage({ senderId: "a", requesterId: "b", requesterRole }), true);
  }
  for (const requesterRole of ["member", "unknown", null]) {
    assert.equal(canDeleteSpaceChatMessage({ senderId: "a", requesterId: "b", requesterRole }), false);
  }
});

test("missing sender or requester fails closed", () => {
  assert.equal(canDeleteSpaceChatMessage({ senderId: "a", requesterRole: "owner" }), false);
  assert.equal(canDeleteSpaceChatMessage({ requesterId: "b", requesterRole: "owner" }), false);
});
