import test from "node:test";
import assert from "node:assert/strict";
import { canAccessCourseLessons } from "../utils/learningAccess.js";

test("free courses remain accessible without enrollment", () => {
  assert.equal(canAccessCourseLessons({ price: 0, enrollment: null }), true);
});

test("paid course lessons require a non-revoked enrollment", () => {
  assert.equal(canAccessCourseLessons({ price: 499, enrollment: null }), false);
  assert.equal(canAccessCourseLessons({ price: 499, enrollment: { accessRevoked: false } }), true);
  assert.equal(canAccessCourseLessons({ price: 499, enrollment: {} }), true);
});

test("refund-revoked enrollment cannot expose paid lesson URLs", () => {
  assert.equal(canAccessCourseLessons({ price: 499, enrollment: { accessRevoked: true } }), false);
});
