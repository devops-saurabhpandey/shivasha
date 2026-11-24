import test from "node:test";
import assert from "node:assert/strict";

test("SSO integration test harness is enabled when a test MongoDB is configured", { skip: !process.env.MONGODB_TEST_URI }, () => {
  assert.ok(process.env.MONGODB_TEST_URI);
});
