import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import ProductMembership, {
  PRODUCT_MEMBERSHIP_PRODUCTS,
  PRODUCT_MEMBERSHIP_ROLES,
  PRODUCT_MEMBERSHIP_STATUSES
} from "../models/ProductMembership.js";

test("membership model exposes only the four approved product IDs", () => {
  assert.deepEqual(PRODUCT_MEMBERSHIP_PRODUCTS, ["social", "business", "edutech", "enterprise"]);
});

test("membership model uses explicit product-scoped roles and statuses", () => {
  assert.ok(PRODUCT_MEMBERSHIP_ROLES.includes("social_creator"));
  assert.ok(PRODUCT_MEMBERSHIP_ROLES.includes("business_owner"));
  assert.ok(PRODUCT_MEMBERSHIP_ROLES.includes("edutech_educator"));
  assert.ok(PRODUCT_MEMBERSHIP_ROLES.includes("enterprise_company_admin"));
  assert.deepEqual(PRODUCT_MEMBERSHIP_STATUSES, ["pending", "active", "suspended", "revoked"]);
});

test("membership schema requires identity, product and role; access is pending by default", () => {
  const schema = ProductMembership.schema;
  for (const field of ["userId", "productId", "role"]) {
    assert.equal(schema.path(field).options.required, true);
  }
  assert.equal(schema.path("status").defaultValue, "pending");
  assert.deepEqual(schema.path("permissions").defaultValue, []);
  assert.equal(schema.path("tenantId").defaultValue, null);
});

test("membership schema has distinct unique indexes for product and tenant memberships", () => {
  const indexes = ProductMembership.schema.indexes();
  const productLevel = indexes.find(([, options]) => options.name === "uniq_product_level_membership");
  const tenantLevel = indexes.find(([, options]) => options.name === "uniq_tenant_product_membership");

  assert.ok(productLevel);
  assert.ok(tenantLevel);
  assert.equal(productLevel[1].unique, true);
  assert.equal(tenantLevel[1].unique, true);
  assert.equal(productLevel[1].partialFilterExpression.tenantId.$type, "null");
  assert.equal(tenantLevel[1].partialFilterExpression.tenantId.$type, "objectId");
});

test("membership schema rejects cross-domain role identifiers", async () => {
  const membership = new ProductMembership({
    userId: new mongoose.Types.ObjectId(),
    productId: "social",
    role: "business_owner"
  });
  await assert.rejects(() => membership.validate(), /role/);
});
