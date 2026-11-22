import test from "node:test";
import assert from "node:assert/strict";
import LearningOrder from "../models/LearningOrder.js";
import LearningReview from "../models/LearningReview.js";

test("learning orders cannot be treated as paid without an explicit reconciliation state", () => {
  const status = LearningOrder.schema.path("status").enumValues;
  assert.deepEqual(status, ["awaiting_payment", "paid", "cancelled", "refund_pending", "refunded"]);
  const provider = LearningOrder.schema.path("provider").enumValues;
  assert.deepEqual(provider, ["unconfigured", "manual_reconciliation"]);
  assert.equal(LearningOrder.schema.path("transactionReference").options.unique, true);
});

test("course reviews enforce one review per student and a 1–5 rating", () => {
  const rating = LearningReview.schema.path("rating");
  assert.equal(rating.options.min, 1);
  assert.equal(rating.options.max, 5);
  const uniqueCourseStudentIndex = LearningReview.schema.indexes().some(([keys, options]) =>
    keys.course === 1 && keys.student === 1 && options.unique === true
  );
  assert.equal(uniqueCourseStudentIndex, true);
});

test("reviews require moderation before publication", () => {
  assert.equal(LearningReview.schema.path("status").defaultValue, "pending_review");
  assert.deepEqual(LearningReview.schema.path("status").enumValues, ["pending_review", "published", "rejected"]);
});
