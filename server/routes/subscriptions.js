import express from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const PLANS = {
  premium: { name: "Premium", amount: 9900, amountRupees: 99, days: 30 },
  business_pro: { name: "Business Pro", amount: 49900, amountRupees: 499, days: 30 }
};

const paymentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  plan: { type: String, enum: ["premium", "business_pro"], required: true },
  orderId: { type: String, required: true, unique: true },
  paymentId: { type: String, unique: true, sparse: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["pending", "active", "failed"], default: "pending", index: true },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });
const PaymentRecord = mongoose.models.ShivashaSubscriptionPayment ||
  mongoose.model("ShivashaSubscriptionPayment", paymentSchema);

function testGatewayReady() {
  return process.env.RAZORPAY_MODE === "test" &&
    Boolean(process.env.RAZORPAY_KEY_ID) &&
    Boolean(process.env.RAZORPAY_KEY_SECRET);
}

async function razorpayRequest(path, method = "GET", body) {
  const auth = Buffer.from(process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1" + path, {
    method,
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Payment provider request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

router.get("/config", async (_req, res) => {
  const active = await PaymentRecord.findOne({
    owner: _req.user.id, status: "active", expiresAt: { $gt: new Date() }
  }).sort({ expiresAt: -1 }).lean();
  res.json({
    checkoutEnabled: testGatewayReady(),
    mode: testGatewayReady() ? "test" : "unavailable",
    plan: active ? { id: active.plan, name: PLANS[active.plan]?.name || active.plan, expiresAt: active.expiresAt } : { id: "free", name: "Free" },
    plans: Object.entries(PLANS).map(([id, p]) => ({ id, name: p.name, amount: p.amountRupees, currency: "INR", periodDays: p.days }))
  });
});

router.post("/orders", async (req, res) => {
  if (!testGatewayReady()) {
    return res.status(503).json({ message: "Test checkout is not configured yet. No payment has been taken." });
  }
  const plan = PLANS[req.body?.plan];
  if (!plan) return res.status(400).json({ message: "Choose a valid subscription plan" });

  try {
    const receipt = ("shv_" + String(req.user.id).slice(-10) + "_" + Date.now()).slice(0, 40);
    const order = await razorpayRequest("/orders", "POST", {
      amount: plan.amount,
      currency: "INR",
      receipt,
      notes: { userId: String(req.user.id), plan: req.body.plan, environment: "test" }
    });
    await PaymentRecord.create({
      owner: req.user.id, plan: req.body.plan, orderId: order.id,
      amount: plan.amount, currency: "INR", status: "pending"
    });
    res.status(201).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: plan.amount,
      currency: "INR",
      plan: plan.name,
      mode: "test"
    });
  } catch (error) {
    console.error("Subscription test order failed:", error.message);
    res.status(502).json({ message: "Could not create a test payment order. Please try again later." });
  }
});

router.post("/verify", async (req, res) => {
  if (!testGatewayReady()) return res.status(503).json({ message: "Test checkout is not configured." });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  if (![orderId, paymentId, signature].every(v => typeof v === "string" && v.length > 0)) {
    return res.status(400).json({ message: "Payment verification details are incomplete." });
  }

  try {
    const record = await PaymentRecord.findOne({ owner: req.user.id, orderId });
    if (!record) return res.status(404).json({ message: "Payment order not found for this account." });
    if (record.status === "active" && record.paymentId === paymentId && record.expiresAt > new Date()) {
      return res.json({ verified: true, plan: PLANS[record.plan].name, expiresAt: record.expiresAt });
    }

    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId).digest();
    let supplied;
    try { supplied = Buffer.from(signature, "hex"); } catch { supplied = Buffer.alloc(0); }
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) {
      return res.status(400).json({ message: "Payment signature could not be verified." });
    }

    const payment = await razorpayRequest("/payments/" + encodeURIComponent(paymentId));
    if (payment.order_id !== record.orderId || payment.amount !== record.amount ||
        payment.currency !== "INR" || payment.status !== "captured") {
      return res.status(409).json({ message: "Payment is not captured or does not match this order. Plan was not activated." });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PLANS[record.plan].days * 24 * 60 * 60 * 1000);
    record.paymentId = paymentId;
    record.status = "active";
    record.expiresAt = expiresAt;
    await record.save();
    res.json({ verified: true, plan: PLANS[record.plan].name, expiresAt });
  } catch (error) {
    console.error("Subscription verification failed:", error.message);
    res.status(502).json({ message: "Could not verify payment status. Plan was not activated." });
  }
});

router.get("/history", async (req, res) => {
  const records = await PaymentRecord.find({ owner: req.user.id })
    .sort({ createdAt: -1 }).limit(20)
    .select("plan amount currency status expiresAt createdAt orderId").lean();
  res.json({ payments: records.map(r => ({ ...r, planName: PLANS[r.plan]?.name || r.plan })) });
});

export default router;
