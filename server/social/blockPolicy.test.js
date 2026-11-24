import test from "node:test";
import assert from "node:assert/strict";
import { buildPostVisibilityFilter, isBlockedEitherDirection } from "./blockPolicy.js";

test("post feed excludes self, users blocked by viewer and users who blocked viewer", () => {
  const filter = buildPostVisibilityFilter("me", ["blocked-a"], ["blocked-me"], { hashtags: "news" });
  assert.deepEqual(filter, { hashtags: "news", author: { $nin: ["blocked-a", "blocked-me"] } });
});
test("post visibility fails closed when viewer identity is missing", () => {
  assert.throws(() => buildPostVisibilityFilter(null), /viewerId is required/);
});
test("detects a block in either direction", () => {
  assert.equal(isBlockedEitherDirection("me", "them", ["them"], []), true);
  assert.equal(isBlockedEitherDirection("me", "them", [], ["me"]), true);
  assert.equal(isBlockedEitherDirection("me", "them", [], []), false);
});
test("same user is not treated as a block relationship", () => {
  assert.equal(isBlockedEitherDirection("me", "me", ["me"], ["me"]), false);
});
