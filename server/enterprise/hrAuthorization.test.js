import test from "node:test";
import assert from "node:assert/strict";
import { createHRCompanyAuthorizationMiddleware, getHRPermission } from "./hrAuthorization.js";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439012";

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function modelResult(value) {
  return { select() { return this; }, lean: async () => value };
}

function makeMiddleware({ company = { _id: companyId, status: "active" }, membership = { companyId, userId, role: "hr_manager", status: "active" }, companyError, membershipError } = {}) {
  const queries = {};
  const middleware = createHRCompanyAuthorizationMiddleware({
    CompanyModel: {
      findById(id) {
        queries.companyId = id;
        if (companyError) throw companyError;
        return modelResult(company);
      }
    },
    MembershipModel: {
      findOne(filter) {
        queries.membershipFilter = filter;
        if (membershipError) throw membershipError;
        return modelResult(membership);
      }
    }
  });
  return { middleware, queries };
}

function request(overrides = {}) {
  return {
    method: "GET",
    path: "/employees",
    headers: { "x-company-id": companyId },
    user: { id: userId, role: "company_owner", companyId: "attacker-company" },
    get(name) { return this.headers[name.toLowerCase()]; },
    ...overrides
  };
}

test("maps HR and payroll routes to least-privilege permissions", () => {
  assert.equal(getHRPermission("GET", "/employees"), "hr.employee.read");
  assert.equal(getHRPermission("POST", "/employees"), "hr.employee.manage");
  assert.equal(getHRPermission("GET", "/payroll-runs"), "hr.payroll.read");
  assert.equal(getHRPermission("POST", "/payroll-runs"), "hr.payroll.prepare");
  assert.equal(getHRPermission("PATCH", "/payroll-runs/run-1/status", "Approved"), "hr.payroll.approve");
  assert.equal(getHRPermission("PATCH", "/payroll-runs/run-1/status", "Paid"), "hr.payroll.release");
});

test("loads active company membership from storage and sets trusted request scope", async () => {
  const { middleware, queries } = makeMiddleware();
  const req = request();
  const res = response();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(req.companyId, companyId);
  assert.equal(req.hrRole, "hr_manager");
  assert.equal(queries.companyId, companyId);
  assert.deepEqual(queries.membershipFilter, { companyId, userId, status: "active" });
});

test("does not trust client or JWT role/company claims", async () => {
  const { middleware } = makeMiddleware({ membership: { companyId, userId, role: "employee", status: "active" } });
  const req = request({
    headers: { "x-company-id": companyId, "x-user-role": "company_owner" },
    user: { id: userId, role: "company_owner", companyId }
  });
  req.method = "POST";
  req.path = "/employees";
  const res = response();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test("rejects missing or malformed company scope", async () => {
  const { middleware } = makeMiddleware();
  for (const value of ["", "not-an-object-id"]) {
    const req = request({ headers: { "x-company-id": value } });
    const res = response();
    await middleware(req, res, () => assert.fail("must reject invalid company"));
    assert.equal(res.statusCode, 400);
  }
});

test("rejects inactive companies and missing or suspended memberships", async () => {
  const cases = [
    { company: { _id: companyId, status: "inactive" }, membership: { companyId, userId, role: "company_owner", status: "active" }, expected: 404 },
    { company: { _id: companyId, status: "active" }, membership: null, expected: 403 },
    { company: { _id: companyId, status: "active" }, membership: { companyId, userId, role: "company_owner", status: "suspended" }, expected: 403 }
  ];
  for (const item of cases) {
    const { middleware } = makeMiddleware(item);
    const res = response();
    await middleware(request(), res, () => assert.fail("must reject inactive access"));
    assert.equal(res.statusCode, item.expected);
  }
});

test("fails closed when company or membership storage is unavailable", async () => {
  for (const options of [{ companyError: new Error("db unavailable") }, { membershipError: new Error("db unavailable") }]) {
    const { middleware } = makeMiddleware(options);
    const res = response();
    await middleware(request(), res, () => assert.fail("must fail closed"));
    assert.equal(res.statusCode, 500);
  }
});
