import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const campaignSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  goal: { type: String, enum: ["leads", "traffic", "awareness", "sales"], required: true },
  format: { type: String, enum: ["Shivasha Social", "Search", "Display", "Video", "Local business"], required: true },
  destination: { type: String, trim: true, maxlength: 2048, default: "" },
  dailyBudget: { type: Number, required: true, min: 50, max: 10000000 },
  durationDays: { type: Number, required: true, min: 1, max: 365 },
  location: { type: String, trim: true, maxlength: 100, default: "" },
  audience: { type: String, enum: ["All adults", "Local customers", "Business owners", "Students", "Creators"], default: "All adults" },
  adText: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ["Draft", "Paused", "Pending review", "Approved", "Rejected"], default: "Draft", index: true },
  reviewNote: { type: String, trim: true, maxlength: 500, default: "" },
  impressions: { type: Number, min: 0, default: 0 },
  clicks: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

const Campaign = mongoose.models.ShivashaAdCampaign || mongoose.model("ShivashaAdCampaign", campaignSchema);
const safeId = id => mongoose.isValidObjectId(id);

// Public ad slot API. Only reviewed, approved campaigns can be served.
// This is an initial serving endpoint; the app UI must place the returned ad in a slot.
router.get("/serve", async (req, res, next) => {
  try {
    const filter = { status: "Approved" };
    const format = String(req.query.format || "").trim();
    if (format) {
      if (!["Shivasha Social", "Search", "Display", "Video", "Local business"].includes(format)) {
        return res.status(400).json({ message: "Invalid ad format." });
      }
      filter.format = format;
    }
    const count = await Campaign.countDocuments(filter);
    if (!count) return res.status(204).end();
    const skip = Math.floor(Math.random() * count);
    const campaign = await Campaign.findOneAndUpdate(filter, { $inc: { impressions: 1 } }, { new: true })
      .sort({ createdAt: -1 }).skip(skip).select("name goal format destination location audience adText").lean();
    if (!campaign) return res.status(204).end();
    res.set("Cache-Control", "no-store");
    res.json({ ad: campaign });
  } catch (error) { next(error); }
});

router.post("/:id/click", async (req, res, next) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({ message: "Invalid campaign ID." });
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, status: "Approved", destination: { $ne: "" } },
      { $inc: { clicks: 1 } },
      { new: true }
    ).select("destination").lean();
    if (!campaign) return res.status(404).json({ message: "Ad destination not available." });
    res.json({ destination: campaign.destination });
  } catch (error) { next(error); }
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ campaigns });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const adText = String(body.adText || "").trim();
    const goal = String(body.goal || "");
    const format = String(body.format || "");
    const dailyBudget = Number(body.dailyBudget);
    const durationDays = Number(body.durationDays);
    const destination = String(body.destination || "").trim();
    const location = String(body.location || "").trim();
    const audience = String(body.audience || "All adults");
    const goals = ["leads", "traffic", "awareness", "sales"];
    const formats = ["Shivasha Social", "Search", "Display", "Video", "Local business"];
    const audiences = ["All adults", "Local customers", "Business owners", "Students", "Creators"];

    if (!name || name.length > 80) return res.status(400).json({ message: "Campaign name is required (maximum 80 characters)." });
    if (!goals.includes(goal)) return res.status(400).json({ message: "Invalid campaign goal." });
    if (!formats.includes(format)) return res.status(400).json({ message: "Invalid ad format." });
    if (!Number.isFinite(dailyBudget) || dailyBudget < 50 || dailyBudget > 10000000) return res.status(400).json({ message: "Daily budget must be between ₹50 and ₹1,00,00,000." });
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) return res.status(400).json({ message: "Duration must be between 1 and 365 days." });
    if (!adText || adText.length > 500) return res.status(400).json({ message: "Ad message is required (maximum 500 characters)." });
    if (destination) {
      try { const url = new URL(destination); if (url.protocol !== "https:") throw new Error("HTTPS required"); }
      catch { return res.status(400).json({ message: "Destination must be a valid HTTPS URL." }); }
    }
    if (!audiences.includes(audience)) return res.status(400).json({ message: "Invalid audience." });

    const campaign = await Campaign.create({
      owner: req.user.id, name, adText, goal, format, dailyBudget, durationDays,
      destination, location, audience, status: "Draft"
    });
    res.status(201).json({ campaign, message: "Campaign plan saved as Draft. It is not a live advertisement." });
  } catch (error) { next(error); }
});

router.post("/:id/submit-review", async (req, res, next) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({ message: "Invalid campaign ID." });
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id, status: { $in: ["Draft", "Rejected"] } },
      { $set: { status: "Pending review", reviewNote: "" } },
      { new: true, runValidators: true }
    );
    if (!campaign) return res.status(409).json({ message: "Only your Draft or Rejected campaigns can be submitted for review." });
    res.json({ campaign, message: "Submitted for review. The ad will not be shown until Shivasha approves it." });
  } catch (error) { next(error); }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({ message: "Invalid campaign ID." });
    const status = String(req.body?.status || "");
    if (!["Draft", "Paused"].includes(status)) return res.status(400).json({ message: "Advertisers can only set Draft or Paused status. Submit Drafts for review." });
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id, status: { $in: ["Draft", "Paused", "Approved"] } },
      { $set: { status } },
      { new: true, runValidators: true }
    );
    if (!campaign) return res.status(404).json({ message: "Campaign not found or cannot be changed in its current status." });
    res.json({ campaign });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (!safeId(req.params.id)) return res.status(400).json({ message: "Invalid campaign ID." });
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, owner: req.user.id, status: { $in: ["Draft", "Rejected"] } });
    if (!campaign) return res.status(409).json({ message: "Only your Draft or Rejected campaigns can be deleted." });
    res.json({ deleted: true });
  } catch (error) { next(error); }
});

export default router;
