import test from "node:test";
import assert from "node:assert/strict";
import { canDeletePost } from "./postAuthorization.js";

test("post author can delete own post", () => {
  assert.equal(canDeletePost({ authorId: "u1", requesterId: "u1", requesterRole: "employee" }), true);
});
test("current privileged role can delete another user's post", () => {
  assert.equal(canDeletePost({ authorId: "u1", requesterId: "u2", requesterRole: "admin" }), true);
  assert.equal(canDeletePost({ authorId: "u1", requesterId: "u2", requesterRole: "manager" }), true);
});
test("ordinary users cannot delete another user's post", () => {
  assert.equal(canDeletePost({ authorId: "u1", requesterId: "u2", requesterRole: "employee" }), false);
});
test("missing identity fails closed", () => {
  assert.equal(canDeletePost({ authorId: "", requesterId: "u2", requesterRole: "admin" }), false);
});
