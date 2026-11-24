import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeHostname,
  getProductHostMap,
  resolveProductDomain,
  getProductEntryFile,
  getProductEntryForHost
} from "../platform/productDomainResolver.js";

const env = {
  SHIVASHA_SOCIAL_HOST: "social.shivasha.com",
  SHIVASHA_BUSINESS_HOST: "business.shivasha.com",
  SHIVASHA_EDUTECH_HOST: "edutech.shivasha.com",
  SHIVASHA_ENTERPRISE_HOST: "enterprise.shivasha.com"
};

test("normalizes hostnames without trusting arbitrary values", () => {
  assert.equal(normalizeHostname(" BUSINESS.SHIVASHA.COM:443 "), "business.shivasha.com");
  assert.equal(normalizeHostname("social.shivasha.com."), "social.shivasha.com");
  assert.equal(normalizeHostname(null), "");
});

test("each configured hostname resolves to exactly one product", () => {
  assert.equal(resolveProductDomain("social.shivasha.com", env), "social");
  assert.equal(resolveProductDomain("business.shivasha.com", env), "business");
  assert.equal(resolveProductDomain("edutech.shivasha.com", env), "edutech");
  assert.equal(resolveProductDomain("enterprise.shivasha.com", env), "enterprise");
});

test("unknown and empty hostnames do not resolve", () => {
  assert.equal(resolveProductDomain("example.com", env), null);
  assert.equal(resolveProductDomain("", env), null);
  assert.equal(resolveProductDomain(null, env), null);
});

test("duplicate host configuration is rejected as ambiguous", () => {
  const duplicate = { ...env, SHIVASHA_BUSINESS_HOST: env.SHIVASHA_SOCIAL_HOST };
  assert.equal(resolveProductDomain("social.shivasha.com", duplicate), null);
});

test("maps products to their dedicated Vite HTML entry points", () => {
  assert.equal(getProductEntryFile("social"), "index.html");
  assert.equal(getProductEntryFile("business"), "business.html");
  assert.equal(getProductEntryFile("edutech"), "edutech.html");
  assert.equal(getProductEntryFile("enterprise"), "enterprise.html");
  assert.equal(getProductEntryFile("unknown"), null);
});

test("returns the selected product and entry file together", () => {
  assert.deepEqual(getProductEntryForHost("edutech.shivasha.com", env), {
    productId: "edutech",
    entryFile: "edutech.html"
  });
});

test("uses the documented default hostnames when overrides are absent", () => {
  assert.deepEqual(getProductHostMap({}), {
    social: "social.shivasha.com",
    business: "business.shivasha.com",
    edutech: "edutech.shivasha.com",
    enterprise: "enterprise.shivasha.com"
  });
});
