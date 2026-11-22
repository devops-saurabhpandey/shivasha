import test from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCTS,
  PRODUCT_IDS,
  getProductById,
  getProductForApiPath
} from "../platform/productRegistry.js";

test("the four product IDs are unique and resolve to four products", () => {
  assert.equal(PRODUCTS.length, 4);
  assert.equal(new Set(PRODUCTS.map(product => product.id)).size, 4);
  for (const id of Object.values(PRODUCT_IDS)) {
    assert.ok(getProductById(id));
  }
});

test("product-specific API paths map to their owning application", () => {
  assert.equal(getProductForApiPath("/api/posts").id, PRODUCT_IDS.SOCIAL);
  assert.equal(getProductForApiPath("/api/messages/123").id, PRODUCT_IDS.SOCIAL);
  assert.equal(getProductForApiPath("/api/business/leads").id, PRODUCT_IDS.BUSINESS);
  assert.equal(getProductForApiPath("/api/sales-agent/run").id, PRODUCT_IDS.BUSINESS);
  assert.equal(getProductForApiPath("/api/education/quiz").id, PRODUCT_IDS.EDUTECH);
  assert.equal(getProductForApiPath("/api/learning/courses").id, PRODUCT_IDS.EDUTECH);
  assert.equal(getProductForApiPath("/api/hr/employees").id, PRODUCT_IDS.ENTERPRISE);
  assert.equal(getProductForApiPath("/api/enterprise/companies").id, PRODUCT_IDS.ENTERPRISE);
});

test("shared platform paths are not incorrectly assigned to a product", () => {
  for (const path of [
    "/api/auth/login",
    "/api/users/me",
    "/api/notifications",
    "/api/analytics/pageview",
    "/api/ai/chat"
  ]) {
    assert.equal(getProductForApiPath(path), null);
  }
});

test("API prefix matching respects path boundaries", () => {
  assert.equal(getProductForApiPath("/api/postscript"), null);
  assert.equal(getProductForApiPath("api/posts"), null);
  assert.equal(getProductForApiPath(null), null);
});

test("product metadata is immutable", () => {
  assert.ok(Object.isFrozen(PRODUCTS));
  assert.ok(Object.isFrozen(PRODUCTS[0]));
  assert.ok(Object.isFrozen(PRODUCTS[0].apiPrefixes));
});
