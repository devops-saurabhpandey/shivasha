import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, default: () => ({ leads: [], campaigns: [], sales: [] }) }
}, { timestamps: true, minimize: false });
const Record = mongoose.models.ShivashaBusinessPlatformData || mongoose.model("ShivashaBusinessPlatformData", schema);

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const cleanText = (value, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";
const cleanNumber = value => {
  if (value === "" || value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const cleanId = value => typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : "";

router.get("/data", async (req, res, next) => {
  try {
    const record = await Record.findOne({ owner: req.user.id }).lean();
    res.json({ data: record?.data || { leads: [], campaigns: [], sales: [] } });
  } catch (error) { next(error); }
});

router.put("/data", async (req, res, next) => {
  try {
    const data = req.body?.data;
    if (!isRecord(data) ||
      !Array.isArray(data.leads) || !Array.isArray(data.campaigns) || !Array.isArray(data.sales) ||
      data.leads.length > 500 || data.campaigns.length > 300 || data.sales.length > 1000 ||
      [...data.leads, ...data.campaigns, ...data.sales].some(item => !isRecord(item))) {
      return res.status(400).json({ message: "Invalid data or record limit exceeded." });
    }

    const safeData = {
      leads: data.leads.map(item => ({
        id: cleanId(item.id), name: cleanText(item.name, 120), email: cleanText(item.email, 254),
        phone: cleanText(item.phone, 40), business: cleanText(item.business, 120),
        source: cleanText(item.source, 80), status: cleanText(item.status, 40),
        value: cleanNumber(item.value), createdAt: cleanText(item.createdAt, 40)
      })),
      campaigns: data.campaigns.map(item => ({
        id: cleanId(item.id), name: cleanText(item.name, 160), channel: cleanText(item.channel, 80),
        business: cleanText(item.business, 120), budget: cleanNumber(item.budget),
        leads: cleanNumber(item.leads), createdAt: cleanText(item.createdAt, 40)
      })),
      sales: data.sales.map(item => ({
        id: cleanId(item.id), customer: cleanText(item.customer, 120), business: cleanText(item.business, 120),
        amount: cleanNumber(item.amount), status: cleanText(item.status, 40),
        createdAt: cleanText(item.createdAt, 40)
      }))
    };

    const record = await Record.findOneAndUpdate(
      { owner: req.user.id },
      { $set: { data: safeData } },
      { new: true, upsert: true, runValidators: true }
    ).lean();
    res.json({ data: record.data, saved: true, updatedAt: record.updatedAt });
  } catch (error) { next(error); }
});

export default router;
