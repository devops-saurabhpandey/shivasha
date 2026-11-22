import test from "node:test";
import assert from "node:assert/strict";
import {
  GUARDIAN_INVITE_TTL_MS,
  getGuardianInviteExpiry,
  buildRedeemableGuardianInviteFilter,
  canRedeemGuardianInvite,
  buildGuardianLinkTransitionFilter,
  buildGuardianLinkTransitionUpdate,
  buildStudentGuardianRequestsFilter,
  buildApprovedGuardianChildrenFilter,
  canGuardianReadStudentProgress
} from "../education/guardianLifecycle.js";

const studentId = "student-a";
const otherStudentId = "student-b";
const guardianId = "guardian-a";
const otherGuardianId = "guardian-b";
const now = new Date("2026-11-22T12:00:00.000Z");

test("guardian invitation expires exactly 24 hours after creation", () => {
  assert.equal(getGuardianInviteExpiry(now).getTime(), now.getTime() + GUARDIAN_INVITE_TTL_MS);
});

test("redeemable invite filter requires unused pending code and future expiry", () => {
  assert.deepEqual(buildRedeemableGuardianInviteFilter("hashed-code", now), {
    inviteHash: "hashed-code",
    guardian: null,
    inviteExpiresAt: { $gt: now },
    status: "pending"
  });
});

test("valid invite can be redeemed by a different account before expiry", () => {
  assert.equal(canRedeemGuardianInvite({
    student: studentId, guardian: null, status: "pending",
    inviteExpiresAt: new Date(now.getTime() + 1000)
  }, guardianId, now), true);
});

test("expired, used, rejected and self-redeemed invites are rejected", () => {
  const base = { student: studentId, guardian: null, status: "pending", inviteExpiresAt: new Date(now.getTime() + 1000) };
  assert.equal(canRedeemGuardianInvite({ ...base, inviteExpiresAt: now }, guardianId, now), false);
  assert.equal(canRedeemGuardianInvite({ ...base, guardian: guardianId }, guardianId, now), false);
  assert.equal(canRedeemGuardianInvite({ ...base, status: "revoked" }, guardianId, now), false);
  assert.equal(canRedeemGuardianInvite(base, studentId, now), false);
  assert.equal(canRedeemGuardianInvite(null, guardianId, now), false);
});

test("redemption update is atomic and binds invite hash, student, unused state and expiry", () => {
  assert.deepEqual({
    ...buildRedeemableGuardianInviteFilter("hashed-code", now),
    student: studentId
  }, {
    inviteHash: "hashed-code", guardian: null,
    inviteExpiresAt: { $gt: now }, status: "pending", student: studentId
  });
});

test("approve and reject transitions are scoped to the owning student and pending link", () => {
  assert.deepEqual(buildGuardianLinkTransitionFilter({ linkId: "link-1", studentId: studentId, action: "approve" }), {
    _id: "link-1", student: studentId, guardian: { $ne: null }, status: "pending"
  });
  assert.deepEqual(buildGuardianLinkTransitionFilter({ linkId: "link-1", studentId: studentId, action: "reject" }), {
    _id: "link-1", student: studentId, guardian: { $ne: null }, status: "pending"
  });
});

test("revoke transition is allowed only from approved state", () => {
  assert.deepEqual(buildGuardianLinkTransitionFilter({ linkId: "link-1", studentId: studentId, action: "revoke" }), {
    _id: "link-1", student: studentId, guardian: { $ne: null }, status: "approved"
  });
});

test("only explicit approval enables progress access; revoked and other guardians are denied", () => {
  const approved = { student: studentId, guardian: guardianId, status: "approved" };
  assert.equal(canGuardianReadStudentProgress(approved, guardianId), true);
  assert.equal(canGuardianReadStudentProgress({ ...approved, status: "pending" }, guardianId), false);
  assert.equal(canGuardianReadStudentProgress({ ...approved, status: "revoked" }, guardianId), false);
  assert.equal(canGuardianReadStudentProgress(approved, otherGuardianId), false);
  assert.equal(canGuardianReadStudentProgress({ ...approved, student: otherStudentId }, guardianId), true);
});

test("guardian request and children queries are bound to the authenticated account and approved state", () => {
  assert.deepEqual(buildStudentGuardianRequestsFilter(studentId), {
    student: studentId, guardian: { $ne: null }, status: "pending"
  });
  assert.deepEqual(buildApprovedGuardianChildrenFilter(guardianId), {
    guardian: guardianId, status: "approved"
  });
});

test("unsupported lifecycle transitions fail instead of silently mutating access", () => {
  assert.throws(() => buildGuardianLinkTransitionUpdate("delete", now), /Unsupported guardian link action/);
  assert.deepEqual(buildGuardianLinkTransitionUpdate("approve", now), { $set: { status: "approved", approvedAt: now } });
  assert.deepEqual(buildGuardianLinkTransitionUpdate("reject", now), { $set: { status: "revoked", revokedAt: now } });
  assert.deepEqual(buildGuardianLinkTransitionUpdate("revoke", now), { $set: { status: "revoked", revokedAt: now } });
});
