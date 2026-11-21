import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Report from "../models/Report.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeMarketplacePaymentReference } from "../utils/marketplaceOrderRules.js";
import AffiliateCommissionLedger from "../models/AffiliateCommissionLedger.js";

const router = express.Router();

router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  } catch (error) { next(error); }
});

router.get("/marketplace-verifications", async (_req, res, next) => {
  try {
    const Model = mongoose.models.ShivashaProviderVerification;
    if (!Model) return res.json({ verifications: [] });
    const verifications = await Model.find({ status: { $in: ["Pending review", "Needs information"] } })
      .populate("owner", "name email").sort({ createdAt: 1 }).limit(200).lean();
    res.json({ verifications });
  } catch (error) { next(error); }
});

router.patch("/marketplace-verifications/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid verification ID." });
    const status = String(req.body?.status || "");
    const reviewNote = String(req.body?.reviewNote || "").trim().slice(0, 500);
    if (!["Verified", "Needs information", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Choose Verified, Needs information, or Rejected." });
    }
    const Model = mongoose.models.ShivashaProviderVerification;
    if (!Model) return res.status(404).json({ message: "Verification requests are not initialized." });
    const verification = await Model.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ["Pending review", "Needs information"] } },
      { $set: { status, reviewNote, reviewedBy: req.user.id, reviewedAt: new Date() } },
      { new: true, runValidators: true }
    ).populate("owner", "name email").lean();
    if (!verification) return res.status(404).json({ message: "Pending verification request not found." });
    res.json({ verification });
  } catch (error) { next(error); }
});


router.get("/marketplace-payments", async (_req, res, next) => {
  try {
    const Order = mongoose.models.ShivashaMarketplaceOrder;
    if (!Order) return res.json({ orders: [] });
    const orders = await Order.find({ status: "Completed", paymentStatus: "Unpaid" })
      .populate("buyer", "name email").populate("provider", "name email")
      .populate("listing", "title").sort({ updatedAt: 1 }).limit(200).lean();
    res.json({ orders, note: "Confirm only after reconciling payment against your actual payment provider/bank statement." });
  } catch (error) { next(error); }
});

router.post("/marketplace-payments/:id/confirm", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order ID." });
    const paymentReference = typeof req.body?.paymentReference === "string" ? req.body.paymentReference.trim() : "";
    const paymentReferenceKey = normalizeMarketplacePaymentReference(paymentReference);
    const platformFeePercent = Number(process.env.MARKETPLACE_PLATFORM_FEE_PERCENT);
    const affiliateSharePercent = Number(process.env.MARKETPLACE_AFFILIATE_SHARE_PERCENT);
    if (paymentReferenceKey.length < 5) return res.status(400).json({ message: "Enter the verified external payment reference (5-120 characters)." });
    if (!Number.isFinite(platformFeePercent) || platformFeePercent < 0 || platformFeePercent > 30 ||
        !Number.isFinite(affiliateSharePercent) || affiliateSharePercent < 0 || affiliateSharePercent > 100) {
      return res.status(503).json({ message: "Revenue rates are not configured. Set MARKETPLACE_PLATFORM_FEE_PERCENT (0-30) and MARKETPLACE_AFFILIATE_SHARE_PERCENT (0-100) after legal and tax review." });
    }
    const Order = mongoose.models.ShivashaMarketplaceOrder;
    if (!Order) return res.status(404).json({ message: "Marketplace order model is not initialized." });
    await Promise.all([Order.init(), AffiliateCommissionLedger.init()]);
    let order = await Order.findById(req.params.id).select("+paymentReferenceKey").lean();
    if (!order || order.status !== "Completed") return res.status(409).json({ message: "Completed order not found." });

    // Recover an interrupted request only when the exact same external reference is supplied.
    if (order.paymentStatus === "Paid") {
      if (order.paymentReferenceKey !== paymentReferenceKey) {
        return res.status(409).json({ message: "This order has already been reconciled with a different payment reference." });
      }
      if (order.affiliate) {
        const existingLedger = await AffiliateCommissionLedger.findOne({ order: order._id });
        if (existingLedger?.status === "Accrued" && order.commissionStatus === "Accrued") {
          return res.status(409).json({ message: "This order and its commission ledger have already been reconciled." });
        }
        if (existingLedger?.status === "Pending") {
          await AffiliateCommissionLedger.updateOne(
            { _id: existingLedger._id, status: "Pending" },
            { $set: { status: "Accrued", accruedAt: order.paidAt || new Date() } }
          );
        }
        const recovered = existingLedger ? await AffiliateCommissionLedger.findById(existingLedger._id).lean() : null;
        if (recovered?.status === "Accrued") {
          await Order.updateOne(
            { _id: order._id, paymentStatus: "Paid", paymentReferenceKey, commissionStatus: "Pending" },
            { $set: { commissionStatus: "Accrued" } }
          );
          const refreshedOrder = await Order.findById(order._id).lean();
          if (refreshedOrder?.commissionStatus !== "Accrued") return res.status(503).json({ message: "Commission ledger is accrued; order status recovery is pending. Retry with the same payment reference." });
          return res.json({ order: refreshedOrder, commissionLedger: recovered, message: "Existing payment reconciliation recovered into the commission ledger. No money was transferred." });
        }
        if (recovered?.status === "Pending") return res.status(503).json({ message: "Payment is recorded; commission ledger recovery is pending. Retry with the same payment reference." });
        if (recovered?.status === "Reversed") return res.status(409).json({ message: "This commission was reversed and cannot be accrued again automatically." });
        return res.status(503).json({ message: "Payment is recorded but its commission ledger entry is missing. Admin review is required." });
      }
      return res.status(409).json({ message: "This order has already been reconciled." });
    }
    if (order.paymentStatus !== "Unpaid") return res.status(409).json({ message: "Order is not in an unpaid state." });

    const fee = Number((order.amount * platformFeePercent / 100).toFixed(2));
    const affiliateCommission = order.affiliate ? Number((fee * affiliateSharePercent / 100).toFixed(2)) : 0;
    let ledgerEntry = null;
    if (order.affiliate) {
      try {
        ledgerEntry = await AffiliateCommissionLedger.create({
          order: order._id, affiliate: order.affiliate, orderAmount: order.amount,
          currency: order.currency, platformFeePercent, platformFeeAmount: fee,
          affiliateSharePercent, commissionAmount: affiliateCommission,
          paymentReferenceKey, status: "Pending", createdBy: req.user.id
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        ledgerEntry = await AffiliateCommissionLedger.findOne({ order: order._id }).select("+paymentReferenceKey");
        if (!ledgerEntry || ledgerEntry.paymentReferenceKey !== paymentReferenceKey || ledgerEntry.status === "Reversed") {
          return res.status(409).json({ message: "A commission ledger entry or payment reference already exists with different details." });
        }
      }
    }

    const reconciledOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: "Completed", paymentStatus: "Unpaid" },
      { $set: {
        paymentStatus: "Paid", paymentReference, paymentReferenceKey, paidAt: new Date(),
        platformFeePercent, platformFeeAmount: fee,
        affiliateSharePercent: order.affiliate ? affiliateSharePercent : 0,
        affiliateCommission, commissionStatus: order.affiliate ? "Pending" : "Not accrued",
        affiliateCommissionEntry: order.affiliate ? {
          order: order._id, affiliate: order.affiliate, amount: affiliateCommission,
          currency: order.currency, sharePercent: affiliateSharePercent, accruedAt: new Date()
        } : null
      } },
      { new: true, runValidators: true }
    );

    if (!reconciledOrder) {
      const current = await Order.findById(order._id).select("+paymentReferenceKey").lean();
      if (current?.paymentStatus === "Paid" && current.paymentReferenceKey === paymentReferenceKey) {
        order = current;
      } else {
        return res.status(409).json({ message: "Another request changed this order. Retry only with the same payment reference if it was already reconciled." });
      }
    } else {
      order = reconciledOrder.toObject();
    }

    if (ledgerEntry) {
      await AffiliateCommissionLedger.updateOne(
        { _id: ledgerEntry._id, status: "Pending" },
        { $set: { status: "Accrued", accruedAt: order.paidAt || new Date() } }
      );
      ledgerEntry = await AffiliateCommissionLedger.findById(ledgerEntry._id).lean();
      if (ledgerEntry?.status !== "Accrued") {
        return res.status(503).json({ message: "Payment is recorded but commission ledger finalization is pending. Retry with the same payment reference." });
      }
      await Order.updateOne(
        { _id: order._id, paymentStatus: "Paid", paymentReferenceKey, commissionStatus: "Pending" },
        { $set: { commissionStatus: "Accrued" } }
      );
      order = await Order.findById(order._id).lean();
    }
    res.json({
      order, commissionLedger: ledgerEntry,
      message: "External payment reconciled and commission recorded in the ledger. This endpoint does not collect or process money or transfer funds."
    });
  } catch (error) {
    if (error?.code === 11000 && (error?.keyPattern?.paymentReferenceKey || error?.keyPattern?.order)) {
      return res.status(409).json({ message: "This payment reference or order already has a commission ledger entry." });
    }
    next(error);
  }
});

router.get("/marketplace-commission-ledger", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const allowed = ["Pending", "Accrued", "Reversed"];
    if (status && !allowed.includes(status)) return res.status(400).json({ message: "Invalid ledger status filter." });
    const filter = status ? { status } : {};
    const [entries, totals] = await Promise.all([
      AffiliateCommissionLedger.find(filter).select("-paymentReferenceKey")
        .populate("affiliate", "name email").populate("createdBy", "name email")
        .populate("order", "amount currency status paymentStatus paidAt")
        .sort({ createdAt: -1 }).limit(500).lean(),
      AffiliateCommissionLedger.aggregate([
        { $match: filter },
        { $group: { _id: { currency: "$currency", status: "$status" }, total: { $sum: "$commissionAmount" }, entries: { $sum: 1 } } }
      ])
    ]);
    res.json({ entries, totals, note: "Ledger records accrued commissions only. No bank/UPI payout is initiated or confirmed by this API." });
  } catch (error) { next(error); }
});

router.get("/ads", async (_req, res, next) => {
  try {
    const Campaign = mongoose.models.ShivashaAdCampaign;
    if (!Campaign) return res.json({ campaigns: [] });
    const campaigns = await Campaign.find({ status: "Pending review" })
      .populate("owner", "name email").sort({ createdAt: 1 }).lean();
    res.json({ campaigns });
  } catch (error) { next(error); }
});

router.patch("/ads/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid campaign ID." });
    const status = String(req.body?.status || "");
    const reviewNote = String(req.body?.reviewNote || "").trim().slice(0, 500);
    if (!["Approved", "Rejected", "Pending review"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved, Rejected, or Pending review." });
    }
    const Campaign = mongoose.models.ShivashaAdCampaign;
    if (!Campaign) return res.status(404).json({ message: "Ad campaigns are not initialized." });
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, status: "Pending review" },
      { $set: { status, reviewNote } },
      { new: true, runValidators: true }
    ).populate("owner", "name email");
    if (!campaign) return res.status(404).json({ message: "Pending campaign not found." });
    res.json({ campaign, message: status === "Approved" ? "Campaign approved for Shivasha ad slots." : status === "Rejected" ? "Campaign rejected." : "Campaign returned to review queue." });
  } catch (error) { next(error); }
});

router.patch("/reports/:id", async (req, res) => {
  const status = String(req.body?.status || "");
  if (!["open", "reviewed", "dismissed"].includes(status)) {
    return res.status(400).json({ message: "Status must be open, reviewed, or dismissed" });
  }
  const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true })
    .populate("reporter", "name email").populate("target", "name email avatarUrl");
  if (!report) return res.status(404).json({ message: "Report not found" });
  res.json({ report });
});

router.get("/software-enquiries", async (_req, res, next) => {
  try {
    const SoftwareEnquiry = mongoose.models.ShivashaSoftwareEnquiry;
    if (!SoftwareEnquiry) return res.json({ enquiries: [] });
    const enquiries = await SoftwareEnquiry.find().populate("customer", "name email").sort({ createdAt: -1 }).lean();
    res.json({ enquiries });
  } catch (error) { next(error); }
});

router.patch("/software-enquiries/:id", async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!["Pending", "Contacted", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid software enquiry status" });
    }
    const SoftwareEnquiry = mongoose.models.ShivashaSoftwareEnquiry;
    if (!SoftwareEnquiry) return res.status(404).json({ message: "Software enquiries are not initialized" });
    const enquiry = await SoftwareEnquiry.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true, runValidators: true })
      .populate("customer", "name email");
    if (!enquiry) return res.status(404).json({ message: "Software enquiry not found" });
    res.json({ enquiry });
  } catch (error) { next(error); }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const [users, posts, openReports, allReports] = await Promise.all([
      User.countDocuments(), Post.countDocuments(), Report.countDocuments({ status: "open" }), Report.countDocuments()
    ]);

    const Lead = mongoose.models.ShivashaCRMLead;
    const Product = mongoose.models.ShivashaBusinessProduct;
    const Order = mongoose.models.ShivashaBusinessOrder;
    const [crmLeads, activeProducts, businessOrders, orderTotals] = await Promise.all([
      Lead ? Lead.countDocuments() : 0,
      Product ? Product.countDocuments({ active: true }) : 0,
      Order ? Order.countDocuments() : 0,
      Order ? Order.aggregate([
        { $match: { status: { $ne: "Cancelled" } } },
        { $group: { _id: null, recordedOrderValue: { $sum: "$price" }, completedOrderValue: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, "$price", 0] } } } }
      ]) : []
    ]);
    res.json({
      users, posts, openReports, allReports,
      business: {
        crmLeads, activeProducts, orders: businessOrders,
        recordedOrderValue: orderTotals[0]?.recordedOrderValue || 0,
        completedOrderValue: orderTotals[0]?.completedOrderValue || 0,
        valueDisclaimer: "Order values are not verified payments or received revenue."
      }
    });
  } catch (error) { next(error); }
});

router.delete("/posts/:id", async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  res.json({ deleted: true, postId: req.params.id });
});

router.patch("/users/:id/block", async (req, res) => {
  const blocked = Boolean(req.body?.blocked);
  if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot moderate your own account" });
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { moderationBlocked: blocked } }, { new: true }).select("_id name");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user, moderationBlocked: blocked });
});


const ProjectTrackerDataSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  tasks: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true, minimize: false });
const ProjectTrackerData = mongoose.models.ShivashaPersonalProjectTracker || mongoose.model("ShivashaPersonalProjectTracker", ProjectTrackerDataSchema);

router.get("/project-tracker", async (req, res, next) => {
  try {
    const record = await ProjectTrackerData.findOne({ owner: req.user.id }).lean();
    res.json({ tasks: record?.tasks || [], initialized: Boolean(record) });
  } catch (error) { next(error); }
});

router.put("/project-tracker", async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.tasks) || req.body.tasks.length > 300) {
      return res.status(400).json({ message: "Tasks must be an array with no more than 300 items." });
    }
    const allowedStatuses = new Set(["pending", "in-progress", "completed"]);
    const allowedPriorities = new Set(["low", "medium", "high"]);
    const tasks = req.body.tasks.map((task, index) => ({
      id: String(task?.id || "task-" + index).slice(0, 100),
      project: String(task?.project || "Shivasha").trim().slice(0, 100),
      title: String(task?.title || "").trim().slice(0, 300),
      status: allowedStatuses.has(task?.status) ? task.status : "pending",
      priority: allowedPriorities.has(task?.priority) ? task.priority : "medium"
    })).filter(task => task.title);
    const record = await ProjectTrackerData.findOneAndUpdate(
      { owner: req.user.id },
      { $set: { tasks } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ tasks: record.tasks });
  } catch (error) { next(error); }
});

export default router;
