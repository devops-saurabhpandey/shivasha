import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Report from "../models/Report.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeMarketplacePaymentReference } from "../utils/marketplaceOrderRules.js";

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
    const paymentReference = typeof req.body?.paymentReference === "string" ? req.body.paymentReference.trim().slice(0, 120) : "";
    const paymentReferenceKey = normalizeMarketplacePaymentReference(paymentReference);
    const platformFeePercent = Number(process.env.MARKETPLACE_PLATFORM_FEE_PERCENT);
    const affiliateSharePercent = Number(process.env.MARKETPLACE_AFFILIATE_SHARE_PERCENT);
    if (paymentReferenceKey.length < 5) return res.status(400).json({ message: "Enter the verified external payment reference." });
    if (!Number.isFinite(platformFeePercent) || platformFeePercent < 0 || platformFeePercent > 30 ||
        !Number.isFinite(affiliateSharePercent) || affiliateSharePercent < 0 || affiliateSharePercent > 100) {
      return res.status(503).json({ message: "Revenue rates are not configured. Set MARKETPLACE_PLATFORM_FEE_PERCENT (0-30) and MARKETPLACE_AFFILIATE_SHARE_PERCENT (0-100) after legal and tax review." });
    }
    const Order = mongoose.models.ShivashaMarketplaceOrder;
    if (!Order) return res.status(404).json({ message: "Marketplace order model is not initialized." });
    // Ensure the unique payment-reference index exists before accepting a reconciliation.
    await Order.init();
    const order = await Order.findOne({ _id: req.params.id, status: "Completed", paymentStatus: "Unpaid" }).lean();
    if (!order) return res.status(409).json({ message: "Completed unpaid order not found, or it has already been reconciled." });
    const fee = Number((order.amount * platformFeePercent / 100).toFixed(2));
    const affiliateCommission = order.affiliate ? Number((fee * affiliateSharePercent / 100).toFixed(2)) : 0;
    // Atomic compare-and-set: only one admin request can reconcile this order.
    // The unique partial index on paymentReferenceKey also prevents reusing a reference on another order.
    const reconciledOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: "Completed", paymentStatus: "Unpaid" },
      { $set: {
        paymentStatus: "Paid",
        paymentReference,
        paymentReferenceKey,
        paidAt: new Date(),
        platformFeePercent,
        platformFeeAmount: fee,
        affiliateSharePercent: order.affiliate ? affiliateSharePercent : 0,
        affiliateCommission,
        commissionStatus: order.affiliate ? "Accrued" : "Not accrued"
      } },
      { new: true, runValidators: true }
    );
    if (!reconciledOrder) return res.status(409).json({ message: "This order was reconciled by another request. Refresh the payment queue." });
    res.json({ order: reconciledOrder, message: "External payment marked as reconciled by admin. This endpoint does not collect or process money." });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.paymentReferenceKey) {
      return res.status(409).json({ message: "This external payment reference has already been used for another order." });
    }
    next(error);
  }
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
