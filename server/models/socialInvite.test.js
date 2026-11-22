import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import SocialInvite from "./SocialInvite.js";

test("SocialInvite stores only hashed token material and has bounded lifecycle fields", () => {
  const invite = new SocialInvite({
    resourceType: "group",
    resourceId: new mongoose.Types.ObjectId(),
    tokenHash: "a".repeat(64),
    createdBy: new mongoose.Types.ObjectId(),
    expiresAt: new Date(Date.now() + 60_000)
  });
  assert.equal(invite.status, "pending");
  assert.equal(invite.redeemedBy, null);
  assert.equal(invite.redeemedAt, null);
  assert.equal(SocialInvite.schema.path("tokenHash").options.select, false);
  assert.deepEqual(SocialInvite.schema.path("resourceType").enumValues, ["group", "community"]);
  assert.ok(SocialInvite.schema.indexes().some(([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 60));
});

test("SocialInvite rejects malformed token hashes", async () => {
  await assert.rejects(() => new SocialInvite({
    resourceType: "group",
    resourceId: new mongoose.Types.ObjectId(),
    tokenHash: "plaintext-token",
    createdBy: new mongoose.Types.ObjectId(),
    expiresAt: new Date()
  }).validate());
});

test("SocialInvite rejects unsupported resource types and lifecycle states", async () => {
  await assert.rejects(() => new SocialInvite({
    resourceType: "enterprise",
    resourceId: new mongoose.Types.ObjectId(),
    tokenHash: "b".repeat(64),
    createdBy: new mongoose.Types.ObjectId(),
    expiresAt: new Date()
  }).validate());
});
