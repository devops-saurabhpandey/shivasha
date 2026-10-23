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
router.get("/data", async (req, res, next) => {
  try {
    const record = await Record.findOne({ owner: req.user.id }).lean();
    res.json({ data: record?.data || { leads: [], campaigns: [], sales: [] } });
  } catch (error) { next(error); }
});
router.put("/data", async (req, res, next) => {
  try {
    const data = req.body?.data;
    if (!data || typeof data !== "object" || Array.isArray(data) ||
      !Array.isArray(data.leads) || !Array.isArray(data.campaigns) || !Array.isArray(data.sales) ||
      data.leads.length > 500 || data.campaigns.length > 300 || data.sales.length > 1000) {
      return res.status(400).json({ message: "Invalid data or record limit exceeded." });
    }
    const safeData = {
      leads: data.leads.map(({id,name,email,phone,business,source,status,value,createdAt})=>({id,name,email,phone,business,source,status,value,createdAt})),
      campaigns: data.campaigns.map(({id,name,channel,business,budget,leads,createdAt})=>({id,name,channel,business,budget,leads,createdAt})),
      sales: data.sales.map(({id,customer,business,amount,status,createdAt})=>({id,customer,business,amount,status,createdAt}))
    };
    const record = await Record.findOneAndUpdate({ owner: req.user.id }, { $set: { data: safeData } }, { new: true, upsert: true, runValidators: true }).lean();
    res.json({ data: record.data, saved: true, updatedAt: record.updatedAt });
  } catch (error) { next(error); }
});
export default router;
