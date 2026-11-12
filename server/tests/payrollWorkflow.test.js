import test from "node:test";
import assert from "node:assert/strict";
import { validatePayrollTransition } from "../enterprise/payrollWorkflow.js";

test("payroll preparer cannot approve their own draft", () => {
  const result = validatePayrollTransition({
    currentStatus: "Draft", nextStatus: "Approved",
    createdBy: "user-a", approvedBy: null, userId: "user-a"
  });
  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 403);
});

test("a different authorized user can approve a draft", () => {
  const result = validatePayrollTransition({
    currentStatus: "Draft", nextStatus: "Approved",
    createdBy: "user-a", approvedBy: null, userId: "user-b"
  });
  assert.deepEqual(result, { allowed: true, noChange: false });
});

test("payroll cannot be released without recorded approval", () => {
  const result = validatePayrollTransition({
    currentStatus: "Approved", nextStatus: "Paid",
    createdBy: "user-a", approvedBy: null, userId: "user-c"
  });
  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 409);
});

test("the approver cannot release the same payroll run", () => {
  const result = validatePayrollTransition({
    currentStatus: "Approved", nextStatus: "Paid",
    createdBy: "user-a", approvedBy: "user-b", userId: "user-b"
  });
  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 403);
});

test("a separate finance user can release approved payroll", () => {
  const result = validatePayrollTransition({
    currentStatus: "Approved", nextStatus: "Paid",
    createdBy: "user-a", approvedBy: "user-b", userId: "finance-c"
  });
  assert.deepEqual(result, { allowed: true, noChange: false });
});

test("payroll status cannot be reopened or moved backwards", () => {
  const result = validatePayrollTransition({
    currentStatus: "Paid", nextStatus: "Draft",
    createdBy: "user-a", approvedBy: "user-b", userId: "user-c"
  });
  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 409);
});

test("repeating the current payroll status is an idempotent no-op", () => {
  const result = validatePayrollTransition({
    currentStatus: "Approved", nextStatus: "Approved",
    createdBy: "user-a", approvedBy: "user-b", userId: "user-c"
  });
  assert.deepEqual(result, { allowed: true, noChange: true });
});
