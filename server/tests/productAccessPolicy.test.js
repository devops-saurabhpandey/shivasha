import test from "node:test";
import assert from "node:assert/strict";
import { evaluateProductAccess } from "../platform/productAccessPolicy.js";

const activeSocialMembership = {
  productId: "social",
  tenantId: null,
  status: "active",
  permissions: ["posts:read", "posts:create"]
};

test("denies access when membership is missing", () => {
  assert.deepEqual(
    evaluateProductAccess({ membership: null, productId: "social" }),
    { allowed: false, reason: "membership_required" }
  );
});

test("allows only the exact active product membership", () => {
  assert.equal(
    evaluateProductAccess({ membership: activeSocialMembership, productId: "social" }).allowed,
    true
  );
  assert.equal(
    evaluateProductAccess({ membership: activeSocialMembership, productId: "business" }).reason,
    "product_mismatch"
  );
});

test("denies suspended or otherwise inactive memberships", () => {
  assert.equal(
    evaluateProductAccess({
      membership: { ...activeSocialMembership, status: "suspended" },
      productId: "social"
    }).reason,
    "membership_inactive"
  );
});

test("requires exact tenant scope and prevents cross-tenant access", () => {
  const tenantMembership = { ...activeSocialMembership, tenantId: "company-a" };
  assert.equal(
    evaluateProductAccess({ membership: tenantMembership, productId: "social", tenantId: "company-a" }).allowed,
    true
  );
  assert.equal(
    evaluateProductAccess({ membership: tenantMembership, productId: "social", tenantId: "company-b" }).reason,
    "tenant_mismatch"
  );
  assert.equal(
    evaluateProductAccess({ membership: tenantMembership, productId: "social" }).reason,
    "tenant_mismatch"
  );
});

test("checks explicit permissions without inferring access from role names", () => {
  assert.equal(
    evaluateProductAccess({
      membership: activeSocialMembership,
      productId: "social",
      permission: "posts:read"
    }).allowed,
    true
  );
  assert.equal(
    evaluateProductAccess({
      membership: activeSocialMembership,
      productId: "social",
      permission: "posts:delete"
    }).reason,
    "permission_required"
  );
});

test("does not treat malformed permission data as permission grants", () => {
  assert.equal(
    evaluateProductAccess({
      membership: { ...activeSocialMembership, permissions: "posts:read" },
      productId: "social",
      permission: "posts:read"
    }).reason,
    "permission_required"
  );
});
