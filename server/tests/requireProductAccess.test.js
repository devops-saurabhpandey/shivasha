import test from "node:test";
import assert from "node:assert/strict";
import { requireProductAccess } from "../middleware/requireProductAccess.js";

const now = new Date("2026-11-22T12:00:00.000Z");
const activeMembership = {
  productId: "business",
  tenantId: "tenant-a",
  status: "active",
  role: "business_owner",
  permissions: ["leads:read"],
  expiresAt: null
};

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function makeRequest(overrides = {}) {
  return { user: { id: "user-1" }, params: {}, ...overrides };
}

test("allows an active member with the exact product, tenant and permission", async () => {
  let filter;
  const middleware = requireProductAccess({
    productId: "business",
    permission: "leads:read",
    tenantResolver: async () => "tenant-a",
    membershipModel: { findOne: async value => { filter = value; return activeMembership; } },
    clock: () => now
  });
  const req = makeRequest();
  const res = makeResponse();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
  assert.equal(filter.userId, "user-1");
  assert.equal(filter.productId, "business");
  assert.equal(filter.tenantId, "tenant-a");
  assert.equal(filter.status, "active");
  assert.deepEqual(filter.$or, [{ expiresAt: null }, { expiresAt: { $gt: now } }]);
  assert.equal(req.productAccess.productId, "business");
  assert.deepEqual(req.productAccess.permissions, ["leads:read"]);
});

test("queries only memberships that have not expired", async () => {
  let filter;
  const middleware = requireProductAccess({
    productId: "business",
    tenantResolver: async () => "tenant-a",
    membershipModel: { findOne: async value => { filter = value; return null; } },
    clock: () => now
  });
  const res = makeResponse();
  await middleware(makeRequest(), res, () => assert.fail("must not call next"));
  assert.deepEqual(filter.$or, [{ expiresAt: null }, { expiresAt: { $gt: now } }]);
  assert.equal(res.statusCode, 403);
});

test("denies missing membership and cross-product membership", async () => {
  for (const membership of [null, { ...activeMembership, productId: "social" }]) {
    const middleware = requireProductAccess({
      productId: "business",
      tenantResolver: async () => "tenant-a",
      membershipModel: { findOne: async () => membership },
      clock: () => now
    });
    const res = makeResponse();
    await middleware(makeRequest(), res, () => assert.fail("must not call next"));
    assert.equal(res.statusCode, 403);
  }
});

test("denies missing permissions and inactive memberships", async () => {
  for (const membership of [
    { ...activeMembership, permissions: [] },
    { ...activeMembership, status: "suspended" }
  ]) {
    const middleware = requireProductAccess({
      productId: "business",
      permission: "leads:read",
      tenantResolver: async () => "tenant-a",
      membershipModel: { findOne: async () => membership },
      clock: () => now
    });
    const res = makeResponse();
    await middleware(makeRequest(), res, () => assert.fail("must not call next"));
    assert.equal(res.statusCode, 403);
  }
});

test("denies tenant scope when trusted tenant resolution returns no tenant", async () => {
  const middleware = requireProductAccess({
    productId: "business",
    tenantResolver: async () => null,
    membershipModel: { findOne: async () => assert.fail("must not query without tenant") }
  });
  const res = makeResponse();
  await middleware(makeRequest(), res, () => assert.fail("must not call next"));
  assert.equal(res.statusCode, 403);
});

test("does not accept client tenant IDs as a substitute for a resolver", async () => {
  let queriedTenant;
  const middleware = requireProductAccess({
    productId: "business",
    membershipModel: { findOne: async filter => { queriedTenant = filter.tenantId; return null; } },
    clock: () => now
  });
  const res = makeResponse();
  await middleware(makeRequest({ body: { tenantId: "attacker-tenant" }, params: { tenantId: "attacker-tenant" } }), res, () => {});
  assert.equal(queriedTenant, null);
  assert.equal(res.statusCode, 403);
});

test("fails closed with 503 when the membership store errors", async () => {
  const middleware = requireProductAccess({
    productId: "business",
    tenantResolver: async () => "tenant-a",
    membershipModel: { findOne: async () => { throw new Error("database unavailable"); } }
  });
  const res = makeResponse();
  await middleware(makeRequest(), res, () => assert.fail("must not call next"));
  assert.equal(res.statusCode, 503);
});

test("requires authentication and rejects invalid product configuration", async () => {
  assert.throws(() => requireProductAccess({ productId: "unknown" }), TypeError);
  const middleware = requireProductAccess({ productId: "business" });
  const res = makeResponse();
  await middleware(makeRequest({ user: null }), res, () => assert.fail("must not call next"));
  assert.equal(res.statusCode, 401);
});
