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
const softwareEnquirySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  plan: { type: String, enum: ["individual", "suite"], required: true },
  modules: [{ type: String, enum: ["social", "crm", "mis", "ecommerce", "creator"] }],
  note: { type: String, trim: true, maxlength: 1000, default: "" },
  status: { type: String, enum: ["Pending", "Contacted", "Approved", "Rejected"], default: "Pending", index: true }
}, { timestamps: true });
const SoftwareEnquiry = mongoose.models.ShivashaSoftwareEnquiry || mongoose.model("ShivashaSoftwareEnquiry", softwareEnquirySchema);
const ownerId = req => req.user.id;

// Optional MSG91 SMS notification. Enquiries are saved even if SMS is not configured
// or the SMS provider is temporarily unavailable.
async function notifySoftwareEnquiryBySms(enquiry) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const recipients = (process.env.SHIVASHA_ENQUIRY_SMS_TO || "")
    .split(",")
    .map(value => value.replace(/\\D/g, ""))
    .filter(value => /^91\\d{10}$/.test(value));
  if (!authKey || !templateId || recipients.length === 0) return "not_configured";

  const planLabel = enquiry.plan === "suite" ? "Business Suite" : "Individual";
  const moduleLabels = {
    social: "Social", crm: "CRM", mis: "MIS",
    ecommerce: "E-Commerce", creator: "Creator Studio"
  };
  const modules = enquiry.modules.map(module => moduleLabels[module] || module).join(", ") || "Suite";
  try {
    const response = await fetch("https://control.msg91.com/api/v5/flow", {
      method: "POST",
      headers: {
        accept: "application/json",
        authkey: authKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: "0",
        recipients: recipients.map(mobiles => ({
          mobiles,
          VAR1: planLabel,
          VAR2: modules,
          VAR3: String(enquiry._id).slice(-8)
        }))
      }),
      signal: AbortSignal.timeout(8000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.type === "error") {
      console.error("SHIVASHA enquiry SMS provider returned an error (details withheld).");
      return "failed";
    }
    return "sent";
  } catch {
    console.error("SHIVASHA enquiry SMS notification failed (details withheld).");
    return "failed";
  }
}

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

router.get("/software-enquiries", async (req, res, next) => {
  try {
    const enquiries = await SoftwareEnquiry.find({ customer: ownerId(req) }).sort({ createdAt: -1 }).lean();
    res.json({ enquiries });
  } catch (e) { next(e); }
});
router.post("/software-enquiries", async (req, res, next) => {
  try {
    const plan = String(req.body?.plan || "");
    const allowedModules = ["social", "crm", "mis", "ecommerce", "creator"];
    const modules = Array.isArray(req.body?.modules) ? [...new Set(req.body.modules.map(String))] : [];
    const note = String(req.body?.note || "").trim();
    if (!["individual", "suite"].includes(plan)) return res.status(400).json({ message: "Choose an available plan model" });
    if (modules.some(module => !allowedModules.includes(module))) return res.status(400).json({ message: "Invalid module selection" });
    if (plan === "individual" && modules.length === 0) return res.status(400).json({ message: "Select at least one module" });
    if (note.length > 1000) return res.status(400).json({ message: "Note must be 1000 characters or fewer" });
    const enquiry = await SoftwareEnquiry.create({ customer: ownerId(req), plan, modules: plan === "suite" ? [] : modules, note });
    const notificationStatus = await notifySoftwareEnquiryBySms(enquiry);
    res.status(201).json({
      enquiry,
      notificationStatus,
      message: "Plan enquiry submitted. No payment has been taken."
    });
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
