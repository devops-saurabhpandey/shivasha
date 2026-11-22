import test from "node:test";
import assert from "node:assert/strict";
import AffiliateCommissionAudit from "../models/AffiliateCommissionAudit.js";

test("affiliate commission audit captures actor, transition and bounded note", () => {
  const schema = AffiliateCommissionAudit.schema;
  assert.equal(schema.path("commission").options.required, true);
  assert.equal(schema.path("actor").options.required, true);
  assert.deepEqual(schema.path("action").enumValues, ["created_pending_review", "approved", "reversed"]);
  assert.deepEqual(schema.path("newStatus").enumValues, ["pending_review", "approved", "reversed"]);
  assert.equal(schema.path("note").options.maxlength, 300);
  assert.equal(schema.options.timestamps, true);
});

test("affiliate audit history is indexed by commission and creation time", () => {
  const hasIndex = AffiliateCommissionAudit.schema.indexes().some(([keys]) => keys.commission === 1 && keys.createdAt === -1);
  assert.equal(hasIndex, true);
});
