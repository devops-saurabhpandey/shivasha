import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Report from "../models/Report.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
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

export default router;
