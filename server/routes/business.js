import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const leadSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  contact: { type: String, trim: true, maxlength: 160, default: "" },
  business: { type: String, trim: true, maxlength: 200, default: "" },
  stage: { type: String, enum: ["New", "Contacted", "Qualified", "Won", "Lost"], default: "New" },
  notes: { type: String, trim: true, maxlength: 2000, default: "" }
}, { timestamps: true });
const productSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, trim: true, maxlength: 80, default: "Software" },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });
const orderSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "ShivashaBusinessProduct", required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Enquiry", "Confirmed", "Completed", "Cancelled"], default: "Enquiry" }
}, { timestamps: true });
const Lead = mongoose.models.ShivashaCRMLead || mongoose.model("ShivashaCRMLead", leadSchema);
const Product = mongoose.models.ShivashaBusinessProduct || mongoose.model("ShivashaBusinessProduct", productSchema);
const Order = mongoose.models.ShivashaBusinessOrder || mongoose.model("ShivashaBusinessOrder", orderSchema);
const ownerId = req => req.user.id;

router.get("/leads", async (req, res, next) => {
  try { res.json({ leads: await Lead.find({ owner: ownerId(req) }).sort({ createdAt: -1 }).lean() }); } catch (e) { next(e); }
});
router.post("/leads", async (req, res, next) => {
  try {
    const { name, contact = "", business = "", stage = "New", notes = "" } = req.body || {};
    if (!String(name || "").trim()) return res.status(400).json({ message: "Customer name is required" });
    if (!["New", "Contacted", "Qualified", "Won", "Lost"].includes(stage)) return res.status(400).json({ message: "Invalid lead stage" });
    const lead = await Lead.create({ owner: ownerId(req), name, contact, business, stage, notes });
    res.status(201).json({ lead });
  } catch (e) { next(e); }
});
router.patch("/leads/:id", async (req, res, next) => {
  try {
    const allowed = ["name", "contact", "business", "stage", "notes"];
    const update = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
    if (update.stage && !["New", "Contacted", "Qualified", "Won", "Lost"].includes(update.stage)) return res.status(400).json({ message: "Invalid lead stage" });
    const lead = await Lead.findOneAndUpdate({ _id: req.params.id, owner: ownerId(req) }, { $set: update }, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ lead });
  } catch (e) { next(e); }
});
router.delete("/leads/:id", async (req, res, next) => {
  try { const lead = await Lead.findOneAndDelete({ _id: req.params.id, owner: ownerId(req) }); if (!lead) return res.status(404).json({ message: "Lead not found" }); res.json({ deleted: true }); } catch (e) { next(e); }
});

router.get("/products", async (req, res, next) => {
  try { res.json({ products: await Product.find({ owner: ownerId(req), active: true }).sort({ createdAt: -1 }).lean() }); } catch (e) { next(e); }
});
router.post("/products", async (req, res, next) => {
  try {
    const { name, price, category = "Software", description = "" } = req.body || {};
    if (!String(name || "").trim() || price === "" || price === undefined || !Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ message: "Product name and a valid non-negative price are required" });
    const product = await Product.create({ owner: ownerId(req), name, price: Number(price), category, description });
    res.status(201).json({ product });
  } catch (e) { next(e); }
});
router.delete("/products/:id", async (req, res, next) => {
  try { const product = await Product.findOneAndUpdate({ _id: req.params.id, owner: ownerId(req), active: true }, { $set: { active: false } }, { new: true }); if (!product) return res.status(404).json({ message: "Product not found" }); res.json({ deleted: true }); } catch (e) { next(e); }
});

router.get("/orders", async (req, res, next) => {
  try { res.json({ orders: await Order.find({ owner: ownerId(req) }).sort({ createdAt: -1 }).lean() }); } catch (e) { next(e); }
});
router.post("/orders", async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.body?.productId, owner: ownerId(req), active: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    const order = await Order.create({ owner: ownerId(req), product: product._id, productName: product.name, price: product.price });
    res.status(201).json({ order });
  } catch (e) { next(e); }
});
router.patch("/orders/:id", async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!["Enquiry", "Confirmed", "Completed", "Cancelled"].includes(status)) return res.status(400).json({ message: "Invalid order status" });
    const order = await Order.findOneAndUpdate({ _id: req.params.id, owner: ownerId(req) }, { $set: { status } }, { new: true, runValidators: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (e) { next(e); }
});

router.get("/mis", async (req, res, next) => {
  try {
    const owner = ownerId(req);
    const [leads, products, orders] = await Promise.all([
      Lead.find({ owner }).select("stage").lean(),
      Product.find({ owner, active: true }).select("price").lean(),
      Order.find({ owner }).select("price status createdAt").lean()
    ]);
    const stages = Object.fromEntries(["New", "Contacted", "Qualified", "Won", "Lost"].map(stage => [stage, leads.filter(l => l.stage === stage).length]));
    res.json({
      scope: "current-user",
      generatedAt: new Date().toISOString(),
      leads: { total: leads.length, stages },
      products: { total: products.length, catalogueValue: products.reduce((sum, p) => sum + p.price, 0) },
      orders: { total: orders.length, enquiries: orders.filter(o => o.status === "Enquiry").length, confirmed: orders.filter(o => o.status === "Confirmed").length, completed: orders.filter(o => o.status === "Completed").length, cancelled: orders.filter(o => o.status === "Cancelled").length, recordedValue: orders.filter(o => o.status !== "Cancelled").reduce((sum, o) => sum + o.price, 0) }
    });
  } catch (e) { next(e); }
});

export default router;
