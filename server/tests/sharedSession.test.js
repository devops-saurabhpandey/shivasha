import test from "node:test";
import assert from "node:assert/strict";
import { buildSharedSession } from "../platform/sharedSession.js";

const now = new Date("2026-11-24T12:00:00.000Z");

test("returns all four products even when a user has no memberships", () => {
  const result = buildSharedSession([], now);
  assert.deepEqual(result.map(item => item.productId), ["social", "business", "edutech", "enterprise"]);
  assert.ok(result.every(item => item.membershipStatus === "not_enrolled"));
});

test("marks active product memberships without exposing tenant identifiers", () => {
  const result = buildSharedSession([{
    productId: "business",
    role: "business_owner",
    status: "active",
    tenantId: "private-tenant-id",
    permissions: ["leads.read"],
    expiresAt: "2026-12-01T00:00:00.000Z"
  }], now);
  const business = result.find(item => item.productId === "business");
  assert.equal(business.membershipStatus, "active");
  assert.equal(business.memberships[0].role, "business_owner");
  assert.equal(business.memberships[0].tenantScoped, true);
  assert.deepEqual(business.memberships[0].permissions, ["leads.read"]);
  assert.equal("tenantId" in business.memberships[0], false);
});

test("expired active memberships are not reported as active", () => {
  const result = buildSharedSession([{
    productId: "edutech",
    role: "edutech_learner",
    status: "active",
    expiresAt: "2026-11-23T00:00:00.000Z"
  }], now);
  assert.equal(result.find(item => item.productId === "edutech").membershipStatus, "inactive");
});

test("ignores unknown products and malformed membership records", () => {
  const result = buildSharedSession([
    null,
    { productId: "unknown", status: "active" },
    { productId: "enterprise", status: "suspended", permissions: "not-an-array" }
  ], now);
  const enterprise = result.find(item => item.productId === "enterprise");
  assert.equal(enterprise.membershipStatus, "inactive");
  assert.deepEqual(enterprise.memberships[0].permissions, []);
});

test("multiple tenant memberships remain separate and do not leak tenant IDs", () => {
  const result = buildSharedSession([
    { productId: "enterprise", role: "enterprise_employee", status: "active", tenantId: "a" },
    { productId: "enterprise", role: "enterprise_read_only", status: "active", tenantId: "b" }
  ], now);
  const enterprise = result.find(item => item.productId === "enterprise");
  assert.equal(enterprise.memberships.length, 2);
  assert.ok(enterprise.memberships.every(item => item.tenantScoped));
  assert.ok(enterprise.memberships.every(item => !("tenantId" in item)));
});
