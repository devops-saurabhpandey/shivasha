import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import EducationGuardianLink from "../models/EducationGuardianLink.js";
import { formatDuplicatePairs, getGuardianIndexMigrationPlan, hasLegacyUniqueGuardianIndex } from "../scripts/guardianIndexMigrationPlan.js";

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

test("guardian migration plan keeps legacy index when no legacy unique index exists", () => {
  const plan = getGuardianIndexMigrationPlan([{ name: "_id_", unique: true }]);
  assert.deepEqual(plan, {
    ensureIndexes: ["approved_guardian_pair_unique", "pending_guardian_pair_unique"],
    dropLegacyUniqueIndex: false
  });
});

test("guardian migration plan identifies the legacy unique index", () => {
  assert.equal(hasLegacyUniqueGuardianIndex([{ name: "student_1_guardian_1", unique: true }]), true);
  assert.equal(hasLegacyUniqueGuardianIndex([{ name: "student_1_guardian_1", unique: false }]), false);
  assert.equal(hasLegacyUniqueGuardianIndex([{ name: "other_index", unique: true }]), false);
});

test("guardian migration duplicate report safely stringifies ids", () => {
  const duplicate = {
    _id: {
      student: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      guardian: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
      status: "pending"
    },
    count: 2,
    ids: [
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
      new mongoose.Types.ObjectId("507f1f77bcf86cd799439014")
    ]
  };
  assert.deepEqual(formatDuplicatePairs([duplicate]), [{
    student: "507f1f77bcf86cd799439011",
    guardian: "507f1f77bcf86cd799439012",
    status: "pending",
    count: 2,
    linkIds: ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"]
  }]);
});

import { getDatabaseReadiness } from "../utils/databaseReadiness.js";

test("database readiness returns 503 while MongoDB is disconnected", () => {
  const result = getDatabaseReadiness(0);
  assert.equal(result.httpStatus, 503);
  assert.equal(result.body.status, "not-ready");
  assert.equal(result.body.database, "not-connected");
});

test("database readiness returns 200 only when MongoDB is connected", () => {
  const result = getDatabaseReadiness(1);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.body.status, "ready");
  assert.equal(result.body.database, "connected");
});
