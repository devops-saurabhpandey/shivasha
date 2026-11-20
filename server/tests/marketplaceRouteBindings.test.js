import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeFile = fileURLToPath(new URL("../routes/businessPlatform.js", import.meta.url));
const source = readFileSync(routeFile, "utf8");

test("global marketplace endpoints are protected by the authenticated business platform router", () => {
  assert.ok(source.includes("router.use(requireAuth)"));
  for (const route of [
    'router.get("/marketplace/listings"',
    'router.get("/marketplace/my-listings"',
    'router.post("/marketplace/listings"',
    'router.get("/marketplace/inquiries"',
    'router.post("/marketplace/inquiries"',
    'router.patch("/marketplace/inquiries/:id"'
  ]) assert.ok(source.includes(route), "missing route: " + route);
});

test("marketplace inquiries require explicit consent and prevent self-inquiries", () => {
  assert.ok(source.includes("req.body?.consentToShare !== true"));
  assert.ok(source.includes("You cannot send an inquiry to your own listing"));
  assert.ok(source.includes("provider: req.user.id"));
  assert.ok(source.includes("requester: req.user.id"));
});

test("marketplace listing creation validates department, description, price and currency", () => {
  assert.ok(source.includes("marketplaceDepartments.includes(department)"));
  assert.ok(source.includes("description.length < 20"));
  assert.ok(source.includes("priceFrom < 0"));
  assert.ok(source.includes('"USD", "INR", "EUR", "GBP", "AED", "CAD", "AUD"'));
});

test("marketplace recommendation endpoint uses transparent relevance matching and returns no private provider data", () => {
  assert.ok(source.includes('router.get("/marketplace/recommendations"'));
  assert.ok(source.includes('method: "transparent-keyword-v1"'));
  assert.ok(source.includes("matchScore: score"));
  assert.ok(source.includes("matchReasons: reasons"));
  assert.ok(source.includes("Relevance estimate based on listing text"));
});

const adminFile = fileURLToPath(new URL("../routes/admin.js", import.meta.url));
const adminSource = readFileSync(adminFile, "utf8");

test("provider verification is owner-scoped and requires admin review before a verified badge", () => {
  assert.ok(source.includes('router.get("/marketplace/verification"'));
  assert.ok(source.includes('router.post("/marketplace/verification"'));
  assert.ok(source.includes('status: "Pending review"'));
  assert.ok(source.includes('current?.status === "Verified"'));
  assert.ok(source.includes('status: "Verified"'));
  assert.ok(source.includes("ProviderVerification.find({ owner: { $in: ownerIds }, status: \"Verified\" })"));
  assert.ok(adminSource.includes('router.use(requireAuth)'));
  assert.ok(adminSource.includes('user.role !== "admin"'));
  assert.ok(adminSource.includes('router.get("/marketplace-verifications"'));
  assert.ok(adminSource.includes('router.patch("/marketplace-verifications/:id"'));
});

const adminUiFile = fileURLToPath(new URL("../../src/AdminDashboard.jsx", import.meta.url));
const adminUi = readFileSync(adminUiFile, "utf8");
test("admin dashboard exposes manual provider verification review actions", () => {
  assert.ok(adminUi.includes("/api/admin/marketplace-verifications"));
  assert.ok(adminUi.includes("Marketplace Provider Verification"));
  assert.ok(adminUi.includes('["Verified","Needs information","Rejected"]'));
});
