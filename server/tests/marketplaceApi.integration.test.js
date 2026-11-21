import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import businessPlatformRoutes from "../routes/businessPlatform.js";
import adminRoutes from "../routes/admin.js";
import User from "../models/User.js";
import AffiliateCommissionLedger from "../models/AffiliateCommissionLedger.js";
import AffiliatePayoutDestination from "../models/AffiliatePayoutDestination.js";
import AffiliatePayoutRequest from "../models/AffiliatePayoutRequest.js";

const mongoUri = process.env.MONGODB_TEST_URI;
const enabled = Boolean(mongoUri);
const secret = process.env.JWT_SECRET || "marketplace-integration-test-secret";
let server;
let baseUrl;
let buyer;
let provider;
let outsider;
let admin;
let secondAdmin;
let affiliate;
let Listing;
let Order;
let CommissionLedger;
let PayoutDestination;
let PayoutRequest;

async function createUser(name, role = "employee") {
  return User.create({
    name,
    email: `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
    passwordHash: "integration-test-only",
    role
  });
}
function token(user) {
  return jwt.sign({ id: String(user._id) }, secret, { expiresIn: "5m" });
}
async function request(path, { user, method = "GET", body } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(user ? { authorization: `Bearer ${token(user)}` } : {}),
      ...(body ? { "content-type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json();
  return { status: response.status, payload };
}
async function createOrder({ amount = 1000, withAffiliate = false } = {}) {
  const listing = await Listing.create({
    owner: provider._id,
    title: "Integration test service",
    department: "Web & Software",
    description: "A sufficiently detailed integration test service listing.",
    priceFrom: 100,
    currency: "INR"
  });
  return Order.create({
    listing: listing._id,
    buyer: buyer._id,
    provider: provider._id,
    affiliate: withAffiliate ? affiliate._id : null,
    referralCode: withAffiliate ? "TEST-REF" : "",
    description: "Integration test order requirement",
    amount,
    currency: "INR",
    status: "Requested",
    paymentStatus: "Unpaid"
  });
}

if (!enabled) {
  test("Marketplace HTTP integration tests require MONGODB_TEST_URI", { skip: true }, () => {});
} else {
  before(async () => {
    process.env.JWT_SECRET = secret;
    process.env.MARKETPLACE_PLATFORM_FEE_PERCENT = "10";
    process.env.MARKETPLACE_AFFILIATE_SHARE_PERCENT = "20";
    await mongoose.connect(mongoUri, { dbName: "shivasha_marketplace_integration_test" });
    Listing = mongoose.model("ShivashaServiceListing");
    Order = mongoose.model("ShivashaMarketplaceOrder");
    CommissionLedger = AffiliateCommissionLedger;
    PayoutDestination = AffiliatePayoutDestination;
    PayoutRequest = AffiliatePayoutRequest;
    await Promise.all([User.init(), Listing.init(), Order.init(), CommissionLedger.init(), PayoutDestination.init(), PayoutRequest.init()]);
    [buyer, provider, outsider, admin, affiliate] = await Promise.all([
      createUser("Buyer"), createUser("Provider"), createUser("Outsider"),
      createUser("Admin", "admin"), createUser("Affiliate")
    ]);
    const app = express();
    app.use(express.json());
    app.use("/api/business-platform", businessPlatformRoutes);
    app.use("/api/admin", adminRoutes);
    app.use((error, _req, res, _next) => res.status(500).json({ message: error.message }));
    await new Promise(resolve => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (mongoose.connection.readyState === 1) {
      await Promise.all([
        User.deleteMany({ _id: { $in: [buyer?._id, provider?._id, outsider?._id, admin?._id, secondAdmin?._id, affiliate?._id].filter(Boolean) } }),
        Listing.deleteMany({}),
        Order.deleteMany({}),
        CommissionLedger.deleteMany({}),\n        PayoutDestination.deleteMany({}),\n        PayoutRequest.deleteMany({})
      ]);
      await mongoose.disconnect();
    }
  });

  test("marketplace HTTP routes reject missing and non-admin authorization", async () => {
    const anonymous = await request("/api/business-platform/marketplace/orders");
    assert.equal(anonymous.status, 401);
    const nonAdmin = await request("/api/admin/marketplace-payments", { user: buyer });
    assert.equal(nonAdmin.status, 403);
  });

  test("order HTTP status changes enforce buyer/provider ownership and transition rules", async () => {
    const order = await createOrder();
    const buyerCannotAccept = await request(`/api/business-platform/marketplace/orders/${order._id}`, {
      user: buyer, method: "PATCH", body: { status: "Accepted" }
    });
    assert.equal(buyerCannotAccept.status, 403);

    const outsiderCannotReadOrChange = await request(`/api/business-platform/marketplace/orders/${order._id}`, {
      user: outsider, method: "PATCH", body: { status: "Cancelled" }
    });
    assert.equal(outsiderCannotReadOrChange.status, 404);

    const accepted = await request(`/api/business-platform/marketplace/orders/${order._id}`, {
      user: provider, method: "PATCH", body: { status: "Accepted" }
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.payload.order.status, "Accepted");

    const completed = await request(`/api/business-platform/marketplace/orders/${order._id}`, {
      user: provider, method: "PATCH", body: { status: "Completed" }
    });
    assert.equal(completed.status, 200);
    assert.equal(completed.payload.order.status, "Completed");
  });

  test("payment reconciliation requires admin, accrues expected affiliate share, and is idempotent per order", async () => {
    const order = await createOrder({ amount: 1000, withAffiliate: true });
    await Order.updateOne({ _id: order._id }, { $set: { status: "Completed" } });
    const denied = await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: provider, method: "POST", body: { paymentReference: "TXN-INT-10001" }
    });
    assert.equal(denied.status, 403);

    const confirmed = await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: " TXN-INT-10001 " }
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.payload.order.paymentStatus, "Paid");
    assert.equal(confirmed.payload.order.platformFeeAmount, 100);
    assert.equal(confirmed.payload.order.affiliateCommission, 20);
    assert.equal(confirmed.payload.commissionLedger.status, "Accrued");
    assert.equal(confirmed.payload.commissionLedger.commissionAmount, 20);
    const ledgerEntries = await CommissionLedger.find({ order: order._id }).select("+paymentReferenceKey").lean();
    assert.equal(ledgerEntries.length, 1);
    assert.equal(ledgerEntries[0].status, "Accrued");
    assert.equal(ledgerEntries[0].paymentReferenceKey, "txn-int-10001");
    await CommissionLedger.updateOne({ order: order._id }, { $set: { commissionAmount: 999 } });
    const immutableLedger = await CommissionLedger.findOne({ order: order._id }).lean();
    assert.equal(immutableLedger.commissionAmount, 20);
    const accrued = await Order.findById(order._id).select("+affiliateCommissionEntry").lean();
    assert.deepEqual({
      order: String(accrued.affiliateCommissionEntry.order),
      affiliate: String(accrued.affiliateCommissionEntry.affiliate),
      amount: accrued.affiliateCommissionEntry.amount,
      currency: accrued.affiliateCommissionEntry.currency,
      sharePercent: accrued.affiliateCommissionEntry.sharePercent
    }, {
      order: String(order._id), affiliate: String(affiliate._id),
      amount: 20, currency: "INR", sharePercent: 20
    });
    await Order.updateOne({ _id: order._id }, { $set: { "affiliateCommissionEntry.amount": 999 } });
    const immutableAccrual = await Order.findById(order._id).select("+affiliateCommissionEntry").lean();
    assert.equal(immutableAccrual.affiliateCommissionEntry.amount, 20);
    assert.match(confirmed.payload.message, /does not collect or process money/i);

    const replay = await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: "txn-int-10001" }
    });
    assert.equal(replay.status, 409);
  });

  test("payment reconciliation rejects duplicate references across different orders", async () => {
    const first = await createOrder();
    const second = await createOrder();
    await Order.updateMany({ _id: { $in: [first._id, second._id] } }, { $set: { status: "Completed" } });
    const firstResult = await request(`/api/admin/marketplace-payments/${first._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: "DUPLICATE-REF-900" }
    });
    assert.equal(firstResult.status, 200);
    const secondResult = await request(`/api/admin/marketplace-payments/${second._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: " duplicate-ref-900 " }
    });
    assert.equal(secondResult.status, 409);
    assert.equal(await Order.countDocuments({ paymentReferenceKey: "duplicate-ref-900" }), 1);
  });

  test("payment reconciliation rejects malformed references", async () => {
    const order = await createOrder();
    await Order.updateOne({ _id: order._id }, { $set: { status: "Completed" } });
    const result = await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: 123456 }
    });
    assert.equal(result.status, 400);
  });

  test("affiliate revenue view omits buyer/provider identity, private description and payment reference", async () => {
    const order = await createOrder({ withAffiliate: true });
    await Order.updateOne({ _id: order._id }, { $set: {
      status: "Completed", paymentStatus: "Paid", paymentReference: "PRIVATE-BANK-REF-123",
      paymentReferenceKey: "private-bank-ref-123", affiliateCommission: 20, commissionStatus: "Accrued"
    } });
    const result = await request("/api/business-platform/marketplace/revenue", { user: affiliate });
    assert.equal(result.status, 200);
    const affiliateOrder = result.payload.orders.find(item => String(item._id) === String(order._id));
    assert.ok(affiliateOrder);
    for (const field of ["buyer", "provider", "description", "paymentReference", "paymentReferenceKey", "referralCode"]) {
      assert.equal(Object.hasOwn(affiliateOrder, field), false, `unexpected private field: ${field}`);
    }
    assert.equal(affiliateOrder.affiliateCommission, 20);
  });

  test("same-reference retry recovers a pending commission ledger after payment is recorded", async () => {
    const order = await createOrder({ amount: 2000, withAffiliate: true });
    await Order.updateOne({ _id: order._id }, { $set: {
      status: "Completed", paymentStatus: "Paid", paymentReference: "RECOVERY-REF-2000",
      paymentReferenceKey: "recovery-ref-2000", paidAt: new Date(),
      platformFeePercent: 10, platformFeeAmount: 200,
      affiliateSharePercent: 20, affiliateCommission: 40, commissionStatus: "Pending"
    } });
    await CommissionLedger.create({
      order: order._id, affiliate: affiliate._id, orderAmount: 2000, currency: "INR",
      platformFeePercent: 10, platformFeeAmount: 200, affiliateSharePercent: 20,
      commissionAmount: 40, paymentReferenceKey: "recovery-ref-2000",
      status: "Pending", createdBy: admin._id
    });
    const result = await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: "RECOVERY-REF-2000" }
    });
    assert.equal(result.status, 200);
    assert.equal(result.payload.commissionLedger.status, "Accrued");
    const storedOrder = await Order.findById(order._id).lean();
    assert.equal(storedOrder.commissionStatus, "Accrued");
  });

  test("admin commission ledger is restricted and hides external payment references", async () => {
    const order = await createOrder({ amount: 1200, withAffiliate: true });
    await Order.updateOne({ _id: order._id }, { $set: { status: "Completed" } });
    const confirmed = await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: "LEDGER-AUDIT-1200" }
    });
    assert.equal(confirmed.status, 200);
    const denied = await request("/api/admin/marketplace-commission-ledger", { user: buyer });
    assert.equal(denied.status, 403);
    const result = await request("/api/admin/marketplace-commission-ledger?status=Accrued", { user: admin });
    assert.equal(result.status, 200);
    const entry = result.payload.entries.find(item => String(item.order?._id) === String(order._id));
    assert.ok(entry);
    assert.equal(entry.status, "Accrued");
    assert.equal(entry.commissionAmount, 24);
    assert.equal(Object.hasOwn(entry, "paymentReferenceKey"), false);
    assert.match(result.payload.note, /No bank\/UPI payout is initiated/i);
  });


  test("affiliate payouts require a verified destination, reserve balances, and enforce two-admin manual execution", async () => {
    const order = await createOrder({ amount: 30000, withAffiliate: true });
    await Order.updateOne({ _id: order._id }, { $set: { status: "Completed" } });
    const confirmed = await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: "PAYOUT-ORDER-PAYMENT-30000" }
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.payload.commissionLedger.commissionAmount, 600);

    const noDestination = await request("/api/business-platform/marketplace/payout-requests", {
      user: affiliate, method: "POST", body: { currency: "INR", idempotencyKey: "payout-request-0001" }
    });
    assert.equal(noDestination.status, 409);

    const destination = await request(`/api/admin/affiliate-payout-destinations/${affiliate._id}`, {
      user: admin, method: "POST", body: {
        recipientReference: "provider-recipient-token-998877",
        maskedDestination: "UPI ••••@bank",
        verificationNote: "KYC reviewed outside Shivasha; recipient token issued by provider."
      }
    });
    assert.equal(destination.status, 200);
    assert.equal(Object.hasOwn(destination.payload.destination, "recipientReference"), false);

    const requested = await request("/api/business-platform/marketplace/payout-requests", {
      user: affiliate, method: "POST", body: { currency: "INR", idempotencyKey: "payout-request-0001" }
    });
    assert.equal(requested.status, 201);
    const payoutId = requested.payload.payoutRequest._id;
    assert.equal(requested.payload.payoutRequest.amount, 600);
    assert.equal(requested.payload.payoutRequest.status, "Requested");
    assert.equal(Object.hasOwn(requested.payload.payoutRequest, "transferReference"), false);

    const replay = await request("/api/business-platform/marketplace/payout-requests", {
      user: affiliate, method: "POST", body: { currency: "INR", idempotencyKey: "payout-request-0001" }
    });
    assert.equal(replay.status, 200);
    assert.equal(String(replay.payload.payoutRequest._id), String(payoutId));
    assert.equal(await CommissionLedger.countDocuments({ payoutRequest: payoutId, status: "Accrued" }), 1);

    const approved = await request(`/api/admin/marketplace-payout-requests/${payoutId}/approve`, {
      user: admin, method: "POST"
    });
    assert.equal(approved.status, 200);
    const approverCannotClaim = await request(`/api/admin/marketplace-payout-requests/${payoutId}/claim`, {
      user: admin, method: "POST"
    });
    assert.equal(approverCannotClaim.status, 403);

    const claimed = await request(`/api/admin/marketplace-payout-requests/${payoutId}/claim`, {
      user: secondAdmin, method: "POST"
    });
    assert.equal(claimed.status, 200);
    assert.equal(claimed.payload.payoutRequest.status, "Processing");

    const otherAdminCannotPay = await request(`/api/admin/marketplace-payout-requests/${payoutId}/mark-paid`, {
      user: admin, method: "POST", body: { transferReference: "BANK-TRANSFER-REF-0001" }
    });
    assert.equal(otherAdminCannotPay.status, 403);

    const paid = await request(`/api/admin/marketplace-payout-requests/${payoutId}/mark-paid`, {
      user: secondAdmin, method: "POST", body: { transferReference: "BANK-TRANSFER-REF-0001" }
    });
    assert.equal(paid.status, 200);
    assert.equal(paid.payload.payoutRequest.status, "Paid");
    assert.equal(Object.hasOwn(paid.payload.payoutRequest, "transferReference"), false);
    assert.equal(await CommissionLedger.countDocuments({ payoutRequest: payoutId, status: "Paid out" }), 1);
    const paidOrder = await Order.findById(order._id).lean();
    assert.equal(paidOrder.commissionStatus, "Paid out");

    const paidReplay = await request(`/api/admin/marketplace-payout-requests/${payoutId}/mark-paid`, {
      user: secondAdmin, method: "POST", body: { transferReference: "bank-transfer-ref-0001" }
    });
    assert.equal(paidReplay.status, 200);
    assert.equal(paidReplay.payload.idempotentReplay, true);

    const available = await request("/api/business-platform/marketplace/payout-requests", { user: affiliate });
    assert.equal(available.payload.available.length, 0);
  });

  test("rejecting an affiliate payout releases its reserved accrued commissions", async () => {
    const order = await createOrder({ amount: 30000, withAffiliate: true });
    await Order.updateOne({ _id: order._id }, { $set: { status: "Completed" } });
    await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: "PAYOUT-REJECT-PAYMENT-30000" }
    });
    await request(`/api/admin/affiliate-payout-destinations/${affiliate._id}`, {
      user: admin, method: "POST", body: {
        recipientReference: "provider-recipient-token-112233",
        maskedDestination: "Bank •••• 7788"
      }
    });
    const requested = await request("/api/business-platform/marketplace/payout-requests", {
      user: affiliate, method: "POST", body: { currency: "INR", idempotencyKey: "payout-request-reject-01" }
    });
    assert.equal(requested.status, 201);
    const payoutId = requested.payload.payoutRequest._id;
    const rejected = await request(`/api/admin/marketplace-payout-requests/${payoutId}/reject`, {
      user: admin, method: "POST", body: { reason: "Recipient details require re-verification." }
    });
    assert.equal(rejected.status, 200);
    assert.equal(await CommissionLedger.countDocuments({ payoutRequest: null, status: "Accrued", affiliate: affiliate._id }), 1);
  });

  test("simultaneous payment confirmations for one order reconcile exactly once", async () => {
    const order = await createOrder({ amount: 1500, withAffiliate: true });
    await Order.updateOne({ _id: order._id }, { $set: { status: "Completed" } });
    const results = await Promise.all(["CONCURRENT-ORDER-REF-A", "CONCURRENT-ORDER-REF-B"].map(paymentReference =>
      request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
        user: admin, method: "POST", body: { paymentReference }
      })
    ));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    const stored = await Order.findById(order._id).select("+paymentReferenceKey +affiliateCommissionEntry").lean();
    assert.equal(stored.paymentStatus, "Paid");
    assert.equal(stored.commissionStatus, "Accrued");
    assert.equal(stored.affiliateCommission, 30);
    assert.ok(["concurrent-order-ref-a", "concurrent-order-ref-b"].includes(stored.paymentReferenceKey));
    assert.equal(stored.affiliateCommissionEntry.amount, 30);
  });

  test("simultaneous confirmations cannot apply one external reference to two orders", async () => {
    const first = await createOrder();
    const second = await createOrder();
    await Order.updateMany({ _id: { $in: [first._id, second._id] } }, { $set: { status: "Completed" } });
    const results = await Promise.all([first, second].map(order =>
      request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
        user: admin, method: "POST", body: { paymentReference: "CONCURRENT-SHARED-REF" }
      })
    ));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
    assert.equal(await Order.countDocuments({ paymentReferenceKey: "concurrent-shared-ref", paymentStatus: "Paid" }), 1);
  });

  test("payment reconciliation rejects references longer than the schema limit without truncating", async () => {
    const order = await createOrder();
    await Order.updateOne({ _id: order._id }, { $set: { status: "Completed" } });
    const tooLong = "X".repeat(121);
    const result = await request(`/api/admin/marketplace-payments/${order._id}/confirm`, {
      user: admin, method: "POST", body: { paymentReference: tooLong }
    });
    assert.equal(result.status, 400);
    const unchanged = await Order.findById(order._id).lean();
    assert.equal(unchanged.paymentStatus, "Unpaid");
    assert.equal(unchanged.paymentReference, "");
  });
}
