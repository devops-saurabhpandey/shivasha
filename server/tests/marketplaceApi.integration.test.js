import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import businessPlatformRoutes from "../routes/businessPlatform.js";
import adminRoutes from "../routes/admin.js";
import User from "../models/User.js";

const mongoUri = process.env.MONGODB_TEST_URI;
const enabled = Boolean(mongoUri);
const secret = process.env.JWT_SECRET || "marketplace-integration-test-secret";
let server;
let baseUrl;
let buyer;
let provider;
let outsider;
let admin;
let affiliate;
let Listing;
let Order;

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
    await Promise.all([User.init(), Listing.init(), Order.init()]);
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
        User.deleteMany({ _id: { $in: [buyer?._id, provider?._id, outsider?._id, admin?._id, affiliate?._id].filter(Boolean) } }),
        Listing.deleteMany({}),
        Order.deleteMany({})
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
}
