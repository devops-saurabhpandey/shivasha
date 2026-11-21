import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getMarketplaceOrderTransitionError, normalizeMarketplacePaymentReference } from "../utils/marketplaceOrderRules.js";

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

test("marketplace revenue foundation tracks affiliate attribution and defers payment confirmation to admin", () => {
  assert.ok(source.includes('router.get("/marketplace/revenue"'));
  assert.ok(source.includes('router.post("/marketplace/orders"'));
  assert.ok(source.includes('router.get("/marketplace/orders"'));
  assert.ok(source.includes('router.patch("/marketplace/orders/:id"'));
  assert.ok(source.includes("affiliateCommission"));
  assert.ok(source.includes('default: "Unpaid"'));
  assert.ok(source.includes("You cannot order your own service."));
  assert.ok(source.includes("Referral code is invalid or inactive."));
  assert.ok(adminSource.includes('router.get("/marketplace-payments"'));
  assert.ok(adminSource.includes('router.post("/marketplace-payments/:id/confirm"'));
  assert.ok(adminSource.includes("MARKETPLACE_PLATFORM_FEE_PERCENT"));
  assert.ok(adminSource.includes("MARKETPLACE_AFFILIATE_SHARE_PERCENT"));
  assert.ok(adminSource.includes("This endpoint does not collect or process money."));
  assert.ok(adminUi.includes("Marketplace Payment Reconciliation"));
  assert.ok(adminSource.includes("affiliateCommissionEntry"));
  assert.ok(source.includes(' .select("_id listing amount currency status paymentStatus affiliateCommission commissionStatus createdAt updatedAt")'.trim()));
});


test("marketplace order transitions enforce buyer and provider roles and valid progression", () => {
  const base = { actorId: "provider-1", buyerId: "buyer-1", providerId: "provider-1", paymentStatus: "Unpaid" };
  assert.equal(getMarketplaceOrderTransitionError({ ...base, currentStatus: "Requested", nextStatus: "Accepted" }), null);
  assert.equal(getMarketplaceOrderTransitionError({ ...base, currentStatus: "Requested", nextStatus: "Completed" }), "This order status transition is not allowed.");
  assert.equal(getMarketplaceOrderTransitionError({ ...base, actorId: "buyer-1", currentStatus: "Requested", nextStatus: "Accepted" }), "Only the provider can update this order status.");
  assert.equal(getMarketplaceOrderTransitionError({ ...base, currentStatus: "Accepted", nextStatus: "Completed" }), null);
  assert.equal(getMarketplaceOrderTransitionError({ ...base, currentStatus: "Completed", nextStatus: "Accepted" }), "This order status transition is not allowed.");
});

test("only the buyer may cancel requested or accepted unpaid orders", () => {
  const base = { currentStatus: "Requested", nextStatus: "Cancelled", buyerId: "buyer-1", providerId: "provider-1", paymentStatus: "Unpaid" };
  assert.equal(getMarketplaceOrderTransitionError({ ...base, actorId: "buyer-1" }), null);
  assert.equal(getMarketplaceOrderTransitionError({ ...base, actorId: "provider-1" }), "Only the buyer can cancel this order.");
  assert.equal(getMarketplaceOrderTransitionError({ ...base, actorId: "buyer-1", currentStatus: "Completed" }), "This order can no longer be cancelled.");
  assert.equal(getMarketplaceOrderTransitionError({ ...base, actorId: "buyer-1", paymentStatus: "Paid" }), "Paid orders require an administrator refund review.");
});

test("payment references normalize case and whitespace and reject non-string input", () => {
  assert.equal(normalizeMarketplacePaymentReference("  TxN-AbC-123  "), "txn-abc-123");
  assert.equal(normalizeMarketplacePaymentReference(12345), "");
  assert.equal(normalizeMarketplacePaymentReference("X".repeat(120)).length, 120);
  assert.equal(normalizeMarketplacePaymentReference("X".repeat(121)), "");
});
