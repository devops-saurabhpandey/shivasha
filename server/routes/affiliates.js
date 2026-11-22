import express from "express";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import AffiliatePartner from "../models/AffiliatePartner.js";
import AffiliateEvent from "../models/AffiliateEvent.js";
import AffiliateCommission from "../models/AffiliateCommission.js";

const router = express.Router();
const POLICY_VERSION = "2026-11-22";
const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const validAmount = value => Number.isFinite(Number(value)) && Number(value) >= 0.01 && Number(value) <= 1000000000;
const cleanText = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required." });
    next();
  } catch (error) { next(error); }
}

router.post("/join", requireAuth, async (req, res, next) => {
  try {
    if (req.body?.acceptPolicy !== true) return res.status(400).json({ message: "Please accept the affiliate partner policy." });
    const existing = await AffiliatePartner.findOne({ user: req.user.id });
    if (existing) return res.status(200).json({ partner: { code: existing.code, status: existing.status, policyVersion: existing.acceptedPolicyVersion } });
    let code;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = "SHV" + crypto.randomBytes(5).toString("hex").toUpperCase();
      if (!await AffiliatePartner.exists({ code })) break;
      code = null;
    }
    if (!code) return res.status(503).json({ message: "Could not create a referral code. Please try again." });
    const partner = await AffiliatePartner.create({ user: req.user.id, code, acceptedPolicyVersion: POLICY_VERSION, acceptedAt: new Date() });
    res.status(201).json({ partner: { code: partner.code, status: partner.status, policyVersion: partner.acceptedPolicyVersion } });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "A partner profile already exists. Refresh and try again." });
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const partner = await AffiliatePartner.findOne({ user: req.user.id }).lean();
    if (!partner) return res.json({ joined: false, policyVersion: POLICY_VERSION });
    const [clicks, enquiries, commissions] = await Promise.all([
      AffiliateEvent.countDocuments({ partner: partner._id, type: "click" }),
      AffiliateEvent.countDocuments({ partner: partner._id, type: "enquiry" }),
      AffiliateCommission.find({ partner: partner._id }).sort({ createdAt: -1 }).limit(100).select("transactionReference productDescription grossAmount ratePercent commissionAmount status createdAt reviewedAt reviewNote").lean()
    ]);
    const totals = commissions.reduce((acc, item) => {
      if (item.status === "approved") acc.approved += item.commissionAmount;
      if (item.status === "pending_review") acc.pending += item.commissionAmount;
      if (item.status === "reversed") acc.reversed += item.commissionAmount;
      return acc;
    }, { approved: 0, pending: 0, reversed: 0 });
    res.json({
      joined: true,
      partner: { code: partner.code, status: partner.status, policyVersion: partner.acceptedPolicyVersion },
      referralUrl: `${process.env.PUBLIC_APP_URL || "https://devops-saurabhpandey.github.io/shivasha/"}?ref=${encodeURIComponent(partner.code)}`,
      metrics: { clicks, enquiries, approvedCommission: roundMoney(totals.approved), pendingReview: roundMoney(totals.pending), reversed: roundMoney(totals.reversed) },
      commissions
    });
  } catch (error) { next(error); }
});

// Public tracking intentionally stores no IP address, device fingerprint, or raw personal data.
router.post("/click/:code", async (req, res, next) => {
  try {
    const code = cleanText(req.params.code, 20).toUpperCase();
    const partner = await AffiliatePartner.findOne({ code, status: "active" }).select("_id code");
    if (!partner) return res.status(404).json({ message: "Referral code not found." });
    const visitorId = req.headers.authorization?.startsWith("Bearer ") ? null : null;
    await AffiliateEvent.create({ partner: partner._id, code: partner.code, type: "click", visitor: visitorId });
    res.status(202).json({ tracked: true });
  } catch (error) { next(error); }
});

// Authenticated opt-in enquiry: the referral owner cannot generate their own lead.
router.post("/enquiry/:code", requireAuth, async (req, res, next) => {
  try {
    const code = cleanText(req.params.code, 20).toUpperCase();
    const partner = await AffiliatePartner.findOne({ code, status: "active" }).select("_id user code");
    if (!partner) return res.status(404).json({ message: "Referral code not found." });
    if (String(partner.user) === String(req.user.id)) return res.status(400).json({ message: "Self-referrals are not eligible." });
    const duplicate = await AffiliateEvent.exists({ partner: partner._id, visitor: req.user.id, type: "enquiry", createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    if (duplicate) return res.status(409).json({ message: "An enquiry from this account was already recorded recently." });
    await AffiliateEvent.create({ partner: partner._id, code: partner.code, type: "enquiry", visitor: req.user.id });
    res.status(201).json({ recorded: true, message: "Enquiry recorded. This is not a sale and does not create commission." });
  } catch (error) { next(error); }
});

router.use("/admin", requireAuth, requireAdmin);

// Admin must verify a real settled transaction before recording a commission candidate.
// A unique transaction reference prevents duplicate commission records.
router.post("/admin/conversions", async (req, res, next) => {
  try {
    const code = cleanText(req.body?.code, 20).toUpperCase();
    const transactionReference = cleanText(req.body?.transactionReference, 120);
    const productDescription = cleanText(req.body?.productDescription, 200);
    const grossAmount = Number(req.body?.grossAmount);
    const ratePercent = Number(req.body?.ratePercent);
    const buyerId = cleanText(req.body?.buyerId, 40);
    const verified = req.body?.verified === true;
    if (!verified) return res.status(400).json({ message: "Confirm that the transaction is real, settled and not refunded." });
    if (!mongoose.isValidObjectId(buyerId)) return res.status(400).json({ message: "A valid buyer account ID is required." });
    if (!transactionReference || !productDescription) return res.status(400).json({ message: "Transaction reference and product description are required." });
    if (!validAmount(grossAmount)) return res.status(400).json({ message: "Enter a valid transaction amount." });
    if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 50) return res.status(400).json({ message: "Commission rate must be between 0 and 50 percent." });
    const partner = await AffiliatePartner.findOne({ code, status: "active" }).select("_id user");
    if (!partner) return res.status(404).json({ message: "Active affiliate partner not found." });
    if (String(partner.user) === buyerId) return res.status(400).json({ message: "Self-purchases are not commission eligible." });
    const buyer = await User.findById(buyerId).select("_id");
    if (!buyer) return res.status(404).json({ message: "Buyer account not found." });
    const commissionAmount = roundMoney(grossAmount * ratePercent / 100);
    const commission = await AffiliateCommission.create({
      partner: partner._id, user: buyer._id, transactionReference, grossAmount: roundMoney(grossAmount),
      ratePercent, commissionAmount, productDescription, verifiedAt: new Date(), status: "pending_review"
    });
    res.status(201).json({ commission });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "This transaction reference already has a commission record." });
    next(error);
  }
});

router.patch("/admin/commissions/:id/review", async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = cleanText(req.body?.status, 20);
    const reviewNote = cleanText(req.body?.reviewNote, 300);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid commission ID." });
    if (!["approved", "reversed"].includes(status)) return res.status(400).json({ message: "Review status must be approved or reversed." });
    const commission = await AffiliateCommission.findOneAndUpdate(
      { _id: id, status: "pending_review" },
      { $set: { status, reviewNote, reviewedBy: req.user.id, reviewedAt: new Date() } },
      { new: true, runValidators: true }
    );
    if (!commission) return res.status(404).json({ message: "Pending commission not found; it may already have been reviewed." });
    res.json({ commission });
  } catch (error) { next(error); }
});

router.get("/admin/commissions", async (req, res, next) => {
  try {
    const status = cleanText(req.query.status, 20);
    const filter = ["pending_review", "approved", "reversed"].includes(status) ? { status } : {};
    const commissions = await AffiliateCommission.find(filter)
      .populate("partner", "code user").populate({ path: "partner", populate: { path: "user", select: "name email" } })
      .populate("user", "name email").sort({ createdAt: -1 }).limit(200).lean();
    res.json({ commissions });
  } catch (error) { next(error); }
});

export default router;
