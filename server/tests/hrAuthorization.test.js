import test from "node:test";
import assert from "node:assert/strict";
import { getHRPermission, createHRCompanyAuthorizationMiddleware } from "../enterprise/hrAuthorization.js";
import { getRolePermissions } from "../enterprise/companyConfig.js";

test("HR read routes require employee read permission", () => {
  assert.equal(getHRPermission("GET", "/employees"), "hr.employee.read");
  assert.equal(getHRPermission("GET", "/attendance"), "hr.employee.read");
  assert.equal(getHRPermission("GET", "/leaves"), "hr.employee.read");
  assert.equal(getHRPermission("GET", "/payroll-attendance-summary"), "hr.employee.read");
});

test("payroll and challan reads require payroll read permission", () => {
  assert.equal(getHRPermission("GET", "/payroll-runs"), "hr.payroll.read");
  assert.equal(getHRPermission("GET", "/challans"), "hr.payroll.read");
});

test("HR writes require employee management permission", () => {
  assert.equal(getHRPermission("POST", "/employees"), "hr.employee.manage");
  assert.equal(getHRPermission("POST", "/attendance"), "hr.employee.manage");
  assert.equal(getHRPermission("PATCH", "/leaves/123/review"), "hr.employee.manage");
});

test("payroll creation and challan writes require preparation permission", () => {
  assert.equal(getHRPermission("POST", "/payroll-runs"), "hr.payroll.prepare");
  assert.equal(getHRPermission("POST", "/challans"), "hr.payroll.prepare");
  assert.equal(getHRPermission("DELETE", "/challans/123"), "hr.payroll.prepare");
});

test("payroll status transitions require explicit approval permission", () => {
  assert.equal(getHRPermission("PATCH", "/payroll-runs/123/status", "Approved"), "hr.payroll.approve");
  assert.equal(getHRPermission("PATCH", "/payroll-runs/123/status", "Paid"), "hr.payroll.release");
});

import mongoose from "mongoose";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";
function query(value) {
  return { select() { return this; }, async lean() { return value; } };
}
function harness({ company = { _id: new mongoose.Types.ObjectId(companyId), status: "active" }, membership = null, header = companyId, method = "GET", path = "/employees", bodyStatus } = {}) {
  const calls = { company: 0, membership: 0, next: 0, status: null, body: null };
  const middleware = createHRCompanyAuthorizationMiddleware({
    CompanyModel: { findById() { calls.company++; return query(company); } },
    MembershipModel: { findOne() { calls.membership++; return query(membership); } }
  });
  const req = { user: { id: userId }, method, path, body: { status: bodyStatus }, get(name) { return name === "x-company-id" ? header : undefined; } };
  const res = {
    status(code) { calls.status = code; return this; },
    json(body) { calls.body = body; return this; }
  };
  return { middleware, req, res, calls };
}

test("HR tenant middleware rejects missing or malformed company ID before database access", async () => {
  const { middleware, req, res, calls } = harness({ header: "not-an-object-id" });
  await middleware(req, res, () => calls.next++);
  assert.equal(calls.status, 400);
  assert.equal(calls.company, 0);
  assert.equal(calls.membership, 0);
  assert.equal(calls.next, 0);
});

test("HR tenant middleware rejects unknown and inactive companies", async () => {
  const unknown = harness({ company: null, membership: null });
  await unknown.middleware(unknown.req, unknown.res, () => unknown.calls.next++);
  assert.equal(unknown.calls.status, 404);

  const inactive = harness({ company: { _id: new mongoose.Types.ObjectId(companyId), status: "inactive" } });
  await inactive.middleware(inactive.req, inactive.res, () => inactive.calls.next++);
  assert.equal(inactive.calls.status, 404);
});

test("HR tenant middleware rejects users without active membership or route permission", async () => {
  const noMembership = harness({ membership: null });
  await noMembership.middleware(noMembership.req, noMembership.res, () => noMembership.calls.next++);
  assert.equal(noMembership.calls.status, 403);

  const financeMember = harness({
    membership: { companyId: new mongoose.Types.ObjectId(companyId), userId, role: "finance_manager", status: "active" },
    method: "POST", path: "/employees"
  });
  await financeMember.middleware(financeMember.req, financeMember.res, () => financeMember.calls.next++);
  assert.equal(financeMember.calls.status, 403);
});

test("HR tenant middleware trusts active database membership and attaches company context", async () => {
  const membership = { companyId: new mongoose.Types.ObjectId(companyId), userId, role: "hr_manager", status: "active" };
  const { middleware, req, res, calls } = harness({ membership, method: "POST", path: "/employees" });
  await middleware(req, res, () => calls.next++);
  assert.equal(calls.next, 1);
  assert.equal(calls.status, null);
  assert.equal(String(req.companyId), companyId);
  assert.equal(req.companyMembership, membership);
  assert.equal(req.hrRole, "hr_manager");
});

test("payroll preparation, approval and release are segregated by role", () => {
  const hr = getRolePermissions("hr_manager");
  const finance = getRolePermissions("finance_manager");
  assert.ok(hr.includes("hr.payroll.prepare"));
  assert.ok(hr.includes("hr.payroll.approve"));
  assert.ok(!hr.includes("hr.payroll.release"));
  assert.ok(finance.includes("hr.payroll.read"));
  assert.ok(finance.includes("hr.payroll.release"));
  assert.ok(!finance.includes("hr.payroll.prepare"));
  assert.ok(!finance.includes("hr.payroll.approve"));
});

test("HR manager may approve payroll but cannot release payment", async () => {
  const membership = { companyId: new mongoose.Types.ObjectId(companyId), userId, role: "hr_manager", status: "active" };
  const approve = harness({ membership, method: "PATCH", path: "/payroll-runs/507f1f77bcf86cd799439013/status", bodyStatus: "Approved" });
  await approve.middleware(approve.req, approve.res, () => approve.calls.next++);
  assert.equal(approve.calls.next, 1);

  const release = harness({ membership, method: "PATCH", path: "/payroll-runs/507f1f77bcf86cd799439013/status", bodyStatus: "Paid" });
  await release.middleware(release.req, release.res, () => release.calls.next++);
  assert.equal(release.calls.status, 403);
});

test("finance manager may release payroll but cannot prepare or approve it", async () => {
  const membership = { companyId: new mongoose.Types.ObjectId(companyId), userId, role: "finance_manager", status: "active" };
  const release = harness({ membership, method: "PATCH", path: "/payroll-runs/507f1f77bcf86cd799439013/status", bodyStatus: "Paid" });
  await release.middleware(release.req, release.res, () => release.calls.next++);
  assert.equal(release.calls.next, 1);

  const approve = harness({ membership, method: "PATCH", path: "/payroll-runs/507f1f77bcf86cd799439013/status", bodyStatus: "Approved" });
  await approve.middleware(approve.req, approve.res, () => approve.calls.next++);
  assert.equal(approve.calls.status, 403);

  const prepare = harness({ membership, method: "POST", path: "/payroll-runs" });
  await prepare.middleware(prepare.req, prepare.res, () => prepare.calls.next++);
  assert.equal(prepare.calls.status, 403);
});
