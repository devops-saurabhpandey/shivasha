import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import CreatorFinanceEntry from "../models/CreatorFinanceEntry.js";
import CreatorFinanceSettings from "../models/CreatorFinanceSettings.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const validAmount = value => Number.isFinite(Number(value)) && Number(value) >= 0.01 && Number(value) <= 1000000000;
const sumType = async type => {
  const result = await CreatorFinanceEntry.aggregate([{ $match: { type } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  return money(result[0]?.total || 0);
};
async function getSettings() {
  return (await CreatorFinanceSettings.findOne({ key: "global" }).lean()) || { creatorPoolPercent: 10 };
}
async function financeSummary() {
  const [revenue, expenses, liabilities, allocated, paid, settings] = await Promise.all([
    sumType("revenue"), sumType("expense"), sumType("liability"), sumType("allocation"), sumType("payout"), getSettings()
  ]);
  const netAvailable = money(Math.max(0, revenue - expenses - liabilities));
  const creatorPool = money(netAvailable * Number(settings.creatorPoolPercent || 0) / 100);
  return {
    currency: "INR", revenue, expenses, liabilities,
    netAvailable, creatorPoolPercent: Number(settings.creatorPoolPercent || 0), creatorPool,
    allocated, paid, unpaidCreatorEarnings: money(Math.max(0, allocated - paid)),
    unallocatedPool: money(Math.max(0, creatorPool - allocated)),
    note: "Illustrative accounting summary: enter only received revenue and real expenses/liabilities. Tax treatment and accounting categories must be verified by your accountant."
  };
}

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [allocated, paid, recent] = await Promise.all([
      CreatorFinanceEntry.aggregate([{ $match: { type: "allocation", creator: new mongoose.Types.ObjectId(req.user.id) } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      CreatorFinanceEntry.aggregate([{ $match: { type: "payout", creator: new mongoose.Types.ObjectId(req.user.id) } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      CreatorFinanceEntry.find({ creator: req.user.id, type: { $in: ["allocation", "payout"] } }).sort({ createdAt: -1 }).limit(50).select("type amount description reference createdAt").lean()
    ]);
    const earned = money(allocated[0]?.total || 0);
    const withdrawn = money(paid[0]?.total || 0);
    res.json({ currency: "INR", earned, paid: withdrawn, pending: money(Math.max(0, earned - withdrawn)), entries: recent });
  } catch (error) { next(error); }
});

router.use("/admin", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  } catch (error) { next(error); }
});

router.get("/admin/creators", async (_req, res, next) => {
  try {
    const creators = await User.find({ role: { $ne: "admin" } }).select("name email role").sort({ name: 1 }).limit(1000).lean();
    res.json({ creators });
  } catch (error) { next(error); }
});

router.get("/admin/summary", async (_req, res, next) => {
  try {
    const summary = await financeSummary();
    const recent = await CreatorFinanceEntry.find().populate("creator", "name email").populate("createdBy", "name email").sort({ createdAt: -1 }).limit(100).lean();
    res.json({ summary, recent });
  } catch (error) { next(error); }
});

router.put("/admin/settings", async (req, res, next) => {
  try {
    const percent = Number(req.body?.creatorPoolPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return res.status(400).json({ message: "Creator Pool percentage must be between 0 and 100." });
    const settings = await CreatorFinanceSettings.findOneAndUpdate(
      { key: "global" },
      { $set: { creatorPoolPercent: percent, updatedBy: req.user.id }, $setOnInsert: { key: "global" } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    res.json({ settings: { creatorPoolPercent: settings.creatorPoolPercent, updatedAt: settings.updatedAt } });
  } catch (error) { next(error); }
});

router.post("/admin/entries", async (req, res, next) => {
  try {
    const type = String(req.body?.type || "");
    const amount = Number(req.body?.amount);
    const description = String(req.body?.description || "").trim();
    const reference = String(req.body?.reference || "").trim();
    if (!["revenue", "expense", "liability"].includes(type)) return res.status(400).json({ message: "Entry type must be revenue, expense, or liability." });
    if (!validAmount(amount)) return res.status(400).json({ message: "Enter a valid positive amount in INR." });
    if (!description || description.length > 300) return res.status(400).json({ message: "Description is required (maximum 300 characters)." });
    const entry = await CreatorFinanceEntry.create({ type, amount: money(amount), description, reference, createdBy: req.user.id });
    res.status(201).json({ entry });
  } catch (error) { next(error); }
});

// Only explicitly labelled test/demo records can be deleted from the admin ledger.
router.delete("/admin/entries/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid finance record ID." });
    const entry = await CreatorFinanceEntry.findById(id);
    if (!entry) return res.status(404).json({ message: "Finance record not found." });
    const testLabel = /\b(test|testing|demo|sample|dummy|sandbox)\b/i;
    if (!testLabel.test(entry.description || "") && !testLabel.test(entry.reference || "")) {
      return res.status(400).json({ message: "Only records explicitly labelled test, demo, sample, dummy, or sandbox can be deleted." });
    }
    await CreatorFinanceEntry.deleteOne({ _id: entry._id });
    res.json({ message: "Test finance record deleted.", deletedId: String(entry._id) });
  } catch (error) { next(error); }
});

router.post("/admin/allocations", async (req, res, next) => {
  try {
    const creatorId = String(req.body?.creatorId || "");
    const amount = Number(req.body?.amount);
    const description = String(req.body?.description || "").trim();
    if (!mongoose.isValidObjectId(creatorId)) return res.status(400).json({ message: "Choose a valid creator account." });
    if (!validAmount(amount)) return res.status(400).json({ message: "Enter a valid positive amount in INR." });
    if (!description || description.length > 300) return res.status(400).json({ message: "Allocation note is required." });
    const creator = await User.findById(creatorId).select("_id role");
    if (!creator || creator.role === "admin") return res.status(404).json({ message: "Creator account not found." });
    const summary = await financeSummary();
    if (money(amount) > summary.unallocatedPool) return res.status(400).json({ message: "Allocation exceeds the unallocated Creator Pool." });
    const entry = await CreatorFinanceEntry.create({ type: "allocation", amount: money(amount), creator: creator._id, description, createdBy: req.user.id });
    res.status(201).json({ entry });
  } catch (error) { next(error); }
});

router.post("/admin/payouts", async (req, res, next) => {
  try {
    const creatorId = String(req.body?.creatorId || "");
    const amount = Number(req.body?.amount);
    const description = String(req.body?.description || "").trim();
    const reference = String(req.body?.reference || "").trim();
    if (!mongoose.isValidObjectId(creatorId)) return res.status(400).json({ message: "Choose a valid creator account." });
    if (!validAmount(amount)) return res.status(400).json({ message: "Enter a valid positive amount in INR." });
    if (!description) return res.status(400).json({ message: "Payment note is required." });
    const creator = await User.findById(creatorId).select("_id");
    if (!creator) return res.status(404).json({ message: "Creator account not found." });
    const [allocated, paid] = await Promise.all([
      CreatorFinanceEntry.aggregate([{ $match: { type: "allocation", creator: creator._id } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      CreatorFinanceEntry.aggregate([{ $match: { type: "payout", creator: creator._id } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);
    const pending = money((allocated[0]?.total || 0) - (paid[0]?.total || 0));
    if (money(amount) > pending) return res.status(400).json({ message: "Payout exceeds this creator's pending earnings." });
    const entry = await CreatorFinanceEntry.create({ type: "payout", amount: money(amount), creator: creator._id, description, reference, createdBy: req.user.id });
    res.status(201).json({ entry });
  } catch (error) { next(error); }
});

export default router;
