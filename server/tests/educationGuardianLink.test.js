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

test("pending guardian pair index prevents duplicate open requests", () => {
  const index = EducationGuardianLink.schema.indexes().find(([, options]) => options.name === "pending_guardian_pair_unique");
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { guardian: { $type: "objectId" }, status: "pending" });
});

test("guardian link status is restricted to the supported lifecycle", () => {
  const statusPath = EducationGuardianLink.schema.path("status");
  assert.deepEqual(statusPath.enumValues, ["pending", "approved", "revoked"]);
  const invalid = new EducationGuardianLink({
    student: new mongoose.Types.ObjectId(),
    guardian: new mongoose.Types.ObjectId(),
    status: "active",
    inviteHash: "test-hash",
    inviteExpiresAt: new Date()
  });
  const error = invalid.validateSync();
  assert.ok(error);
  assert.ok(error.errors.status);
});

test("invitation hash is excluded from ordinary query results", () => {
  const inviteHashPath = EducationGuardianLink.schema.path("inviteHash");
  assert.equal(inviteHashPath.options.select, false);
});

test("guardian link can be validated with a nullable guardian while invitation is pending", () => {
  const link = new EducationGuardianLink({
    student: new mongoose.Types.ObjectId(),
    guardian: null,
    status: "pending",
    inviteHash: "test-hash",
    inviteExpiresAt: new Date(Date.now() + 60_000)
  });
  assert.equal(link.validateSync(), undefined);
});
