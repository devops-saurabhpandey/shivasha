import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import EducationGuardianLink from "../models/EducationGuardianLink.js";

test("guardian link requires student and invitation fields", () => {
  const error = new EducationGuardianLink({}).validateSync();
  assert.ok(error);
  assert.ok(error.errors.student);
  assert.ok(error.errors.inviteHash);
  assert.ok(error.errors.inviteExpiresAt);
});

test("approved guardian pair index is partial and unique", () => {
  const index = EducationGuardianLink.schema.indexes().find(([, options]) => options.name === "approved_guardian_pair_unique");
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { guardian: { $type: "objectId" }, status: "approved" });
});
