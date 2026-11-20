import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  data: { type: mongoose.Schema.Types.Mixed, default: () => ({ leads: [], campaigns: [], sales: [], workflows: [], workflowRuns: [], tasks: [], notifications: [], activities: [], messageDrafts: [] }) }
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
    res.json({ data: { leads: [], campaigns: [], sales: [], workflows: [], workflowRuns: [], tasks: [], notifications: [], activities: [], messageDrafts: [], ...(record?.data || {}) } });
  } catch (error) { next(error); }
});

router.post("/workflows/trigger", async (req, res, next) => {
  try {
    const event = cleanText(req.body?.event, 80);
    const leadId = cleanId(req.body?.leadId);
    if (event !== "New lead created" || leadId === "") return res.status(400).json({ message: "Unsupported event or missing lead ID." });
    const record = await Record.findOne({ owner: req.user.id });
    if (!record) return res.json({ triggered: 0, runs: [] });
    const data = { leads: [], campaigns: [], sales: [], workflows: [], workflowRuns: [], tasks: [], notifications: [], activities: [], messageDrafts: [], ...(record.data || {}) };
    const lead = data.leads.find(item => String(item.id) === String(leadId));
    if (!lead) return res.status(404).json({ message: "Lead not found in this account." });
    const matching = data.workflows.filter(item => item && item.enabled !== false && item.trigger === event);
    const now = new Date().toISOString();
    const runs = matching.map(workflow => {
      const runId = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
      const base = { id: runId, workflowId: cleanId(workflow.id), workflowName: cleanText(workflow.name, 120), trigger: event, action: cleanText(workflow.action, 80), status: "completed", detail: "", leadId: cleanId(lead.id), createdAt: now };
      if (workflow.action === "Create follow-up task") { data.tasks.unshift({ id: runId, leadId: cleanId(lead.id), leadName: cleanText(lead.name, 120), title: "Follow up with " + cleanText(lead.name, 120), status: "Open", createdAt: now, source: "workflow" }); base.detail = "Follow-up task created."; }
      else if (workflow.action === "Notify lead owner") { data.notifications.unshift({ id: runId, leadId: cleanId(lead.id), message: "New lead: " + cleanText(lead.name, 120), read: false, createdAt: now, source: "workflow" }); base.detail = "In-app notification record created; external delivery is not configured."; }
      else if (workflow.action === "Add activity note") { data.activities.unshift({ id: runId, leadId: cleanId(lead.id), note: "Workflow " + cleanText(workflow.name, 120) + " triggered for this lead.", createdAt: now }); base.detail = "CRM activity note added."; }
      else if (workflow.action === "Prepare message draft") { data.messageDrafts.unshift({ id: runId, leadId: cleanId(lead.id), leadName: cleanText(lead.name, 120), message: "Hello " + cleanText(lead.name, 120) + ", thank you for your interest. May we learn more about your requirements?", status: "Needs review", createdAt: now }); base.detail = "Draft prepared; human review required."; }
      else { base.status = "skipped"; base.detail = "Unsupported action."; }
      return base;
    });
    data.workflowRuns = [...runs, ...(data.workflowRuns || [])].slice(0, 500);
    record.data = data;
    await record.save();
    return res.json({ triggered: runs.length, runs, tasksCreated: runs.filter(run => run.action === "Create follow-up task" && run.status === "completed").length });
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
      })),
      workflows: (data.workflows || []).filter(isRecord).slice(0, 200).map(item => ({
        id: cleanId(item.id), name: cleanText(item.name, 120), trigger: cleanText(item.trigger, 80),
        action: cleanText(item.action, 80), enabled: item.enabled !== false, createdAt: cleanText(item.createdAt, 40)
      })),
      workflowRuns: (data.workflowRuns || []).filter(isRecord).slice(0, 500).map(item => ({
        id: cleanId(item.id), workflowId: cleanId(item.workflowId), workflowName: cleanText(item.workflowName, 120),
        trigger: cleanText(item.trigger, 80), action: cleanText(item.action, 80), status: cleanText(item.status, 40),
        detail: cleanText(item.detail, 240), leadId: cleanId(item.leadId), createdAt: cleanText(item.createdAt, 40)
      })),
      tasks: (data.tasks || []).filter(isRecord).slice(0, 500).map(item => ({
        id: cleanId(item.id), leadId: cleanId(item.leadId), leadName: cleanText(item.leadName, 120),
        title: cleanText(item.title, 160), status: cleanText(item.status, 40), createdAt: cleanText(item.createdAt, 40), source: cleanText(item.source, 40)
      })),
      notifications: (data.notifications || []).filter(isRecord).slice(0, 500).map(item => ({
        id: cleanId(item.id), leadId: cleanId(item.leadId), message: cleanText(item.message, 240),
        read: item.read === true, createdAt: cleanText(item.createdAt, 40), source: cleanText(item.source, 40)
      })),
      activities: (data.activities || []).filter(isRecord).slice(0, 500).map(item => ({
        id: cleanId(item.id), leadId: cleanId(item.leadId), note: cleanText(item.note, 240), createdAt: cleanText(item.createdAt, 40)
      })),
      messageDrafts: (data.messageDrafts || []).filter(isRecord).slice(0, 500).map(item => ({
        id: cleanId(item.id), leadId: cleanId(item.leadId), leadName: cleanText(item.leadName, 120),
        message: cleanText(item.message, 1000), status: cleanText(item.status, 40), createdAt: cleanText(item.createdAt, 40)
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


const marketplaceDepartments = [
  "AI Services", "Web & Software", "Global Projects", "Business Directory",
  "Freelancers & Experts", "Education & Skill Development", "Finance & Insurance",
  "E-commerce & Suppliers"
];
const serviceListingSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  department: { type: String, required: true, enum: marketplaceDepartments },
  category: { type: String, trim: true, maxlength: 80, default: "" },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  country: { type: String, trim: true, maxlength: 80, default: "Remote" },
  priceFrom: { type: Number, min: 0, default: 0 },
  currency: { type: String, enum: ["USD", "INR", "EUR", "GBP", "AED", "CAD", "AUD"], default: "USD" },
  status: { type: String, enum: ["active", "paused", "removed"], default: "active", index: true }
}, { timestamps: true });
serviceListingSchema.index({ status: 1, department: 1, createdAt: -1 });
serviceListingSchema.index({ title: "text", description: "text", category: "text" });
const ServiceListing = mongoose.models.ShivashaServiceListing || mongoose.model("ShivashaServiceListing", serviceListingSchema);

const marketplaceInquirySchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "ShivashaServiceListing", required: true, index: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  consentToShare: { type: Boolean, required: true, default: false },
  status: { type: String, enum: ["New", "Contacted", "Qualified", "Closed"], default: "New" }
}, { timestamps: true });
marketplaceInquirySchema.index({ provider: 1, createdAt: -1 });
marketplaceInquirySchema.index({ requester: 1, createdAt: -1 });
const MarketplaceInquiry = mongoose.models.ShivashaMarketplaceInquiry || mongoose.model("ShivashaMarketplaceInquiry", marketplaceInquirySchema);

// All marketplace routes inherit requireAuth above. Search results expose no private contact details.
router.get("/marketplace/listings", async (req, res, next) => {
  try {
    const filter = { status: "active" };
    const department = cleanText(req.query.department, 80);
    const q = cleanText(req.query.q, 100);
    if (marketplaceDepartments.includes(department)) filter.department = department;
    if (q) filter.$text = { $search: q };
    const listings = await ServiceListing.find(filter)
      .select("owner title department category description country priceFrom currency status createdAt")
      .populate("owner", "name")
      .sort({ createdAt: -1 }).limit(100).lean();
    const ownerIds = [...new Set(listings.map(item => String(item.owner?._id || item.owner)).filter(Boolean))];
    const verifiedOwners = await ProviderVerification.find({ owner: { $in: ownerIds }, status: "Verified" }).select("owner").lean();
    const verifiedSet = new Set(verifiedOwners.map(item => String(item.owner)));
    res.json({ listings: listings.map(item => ({
      ...item, ownerName: item.owner?.name || "Shivasha provider",
      providerVerified: verifiedSet.has(String(item.owner?._id || item.owner)),
      owner: undefined
    })) });
  } catch (error) { next(error); }
});

router.get("/marketplace/my-listings", async (req, res, next) => {
  try {
    const listings = await ServiceListing.find({ owner: req.user.id, status: { $ne: "removed" } })
      .sort({ createdAt: -1 }).limit(100).lean();
    res.json({ listings });
  } catch (error) { next(error); }
});

router.post("/marketplace/listings", async (req, res, next) => {
  try {
    const title = cleanText(req.body?.title, 120);
    const department = cleanText(req.body?.department, 80);
    const description = cleanText(req.body?.description, 2000);
    const category = cleanText(req.body?.category, 80);
    const country = cleanText(req.body?.country, 80) || "Remote";
    const currency = cleanText(req.body?.currency, 3);
    const priceFrom = cleanNumber(req.body?.priceFrom);
    if (!title || !description || description.length < 20 || !marketplaceDepartments.includes(department)) {
      return res.status(400).json({ message: "Add a title, at least 20 characters of description, and a valid department." });
    }
    if (!["USD", "INR", "EUR", "GBP", "AED", "CAD", "AUD"].includes(currency) || priceFrom < 0 || priceFrom > 100000000) {
      return res.status(400).json({ message: "Invalid starting price or currency." });
    }
    const listing = await ServiceListing.create({
      owner: req.user.id, title, department, description, category, country, currency, priceFrom, status: "active"
    });
    res.status(201).json({ listing });
  } catch (error) { next(error); }
});

router.get("/marketplace/inquiries", async (req, res, next) => {
  try {
    const records = await MarketplaceInquiry.find({
      $or: [{ provider: req.user.id }, { requester: req.user.id }]
    }).sort({ createdAt: -1 }).limit(200).populate("listing", "title department").lean();
    const inquiries = records.map(item => ({
      _id: item._id, listingId: item.listing?._id,
      listingTitle: item.listing?.title || "Service inquiry",
      department: item.listing?.department || "", message: item.message,
      status: item.status, createdAt: item.createdAt,
      direction: String(item.provider) === String(req.user.id) ? "received" : "sent"
    }));
    res.json({ inquiries });
  } catch (error) { next(error); }
});

router.post("/marketplace/inquiries", async (req, res, next) => {
  try {
    const listingId = req.body?.listingId;
    const message = cleanText(req.body?.message, 2000);
    if (!mongoose.isValidObjectId(listingId) || message.length < 10 || req.body?.consentToShare !== true) {
      return res.status(400).json({ message: "A valid listing, requirement of at least 10 characters, and explicit sharing consent are required." });
    }
    const listing = await ServiceListing.findOne({ _id: listingId, status: "active" }).select("owner");
    if (!listing) return res.status(404).json({ message: "This service listing is no longer available." });
    if (String(listing.owner) === String(req.user.id)) return res.status(400).json({ message: "You cannot send an inquiry to your own listing." });
    const inquiry = await MarketplaceInquiry.create({
      listing: listing._id, provider: listing.owner, requester: req.user.id, message, consentToShare: true
    });
    res.status(201).json({ inquiry: { _id: inquiry._id, status: inquiry.status, createdAt: inquiry.createdAt } });
  } catch (error) { next(error); }
});

router.patch("/marketplace/inquiries/:id", async (req, res, next) => {
  try {
    const status = cleanText(req.body?.status, 20);
    if (!["New", "Contacted", "Qualified", "Closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid inquiry status." });
    }
    const inquiry = await MarketplaceInquiry.findOneAndUpdate(
      { _id: req.params.id, provider: req.user.id },
      { $set: { status } }, { new: true, runValidators: true }
    ).lean();
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found for this provider account." });
    res.json({ inquiry: { _id: inquiry._id, status: inquiry.status } });
  } catch (error) { next(error); }
});



const verificationSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  country: { type: String, required: true, trim: true, maxlength: 80 },
  website: { type: String, trim: true, maxlength: 200, default: "" },
  businessEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
  registrationType: { type: String, enum: ["Company", "Sole proprietor", "Partnership", "Non-profit", "Other"], required: true },
  publicDescription: { type: String, trim: true, maxlength: 300, default: "" },
  status: { type: String, enum: ["Not submitted", "Pending review", "Needs information", "Verified", "Rejected"], default: "Pending review", index: true },
  reviewNote: { type: String, trim: true, maxlength: 500, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });
const ProviderVerification = mongoose.models.ShivashaProviderVerification || mongoose.model("ShivashaProviderVerification", verificationSchema);

router.get("/marketplace/verification", async (req, res, next) => {
  try {
    const verification = await ProviderVerification.findOne({ owner: req.user.id })
      .select("businessName country website businessEmail registrationType publicDescription status reviewNote createdAt updatedAt").lean();
    res.json({ verification });
  } catch (error) { next(error); }
});

router.post("/marketplace/verification", async (req, res, next) => {
  try {
    const businessName = cleanText(req.body?.businessName, 120);
    const country = cleanText(req.body?.country, 80);
    const website = cleanText(req.body?.website, 200);
    const businessEmail = cleanText(req.body?.businessEmail, 254).toLowerCase();
    const registrationType = cleanText(req.body?.registrationType, 30);
    const publicDescription = cleanText(req.body?.publicDescription, 300);
    const allowedTypes = ["Company", "Sole proprietor", "Partnership", "Non-profit", "Other"];
    const validWebsite = !website || /^https:\/\/(?:[a-z0-9-]+\\.)+[a-z]{2,}(?::\\d{1,5})?(?:\/[^\\s]*)?$/i.test(website);
    const validEmail = !businessEmail || /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(businessEmail);
    if (!businessName || !country || !allowedTypes.includes(registrationType) || !validWebsite || !validEmail) {
      return res.status(400).json({ message: "Provide a business name, country, valid registration type, and valid optional website/email." });
    }
    const current = await ProviderVerification.findOne({ owner: req.user.id }).lean();
    if (current?.status === "Verified") return res.status(409).json({ message: "This provider is already verified. Contact support to update verified details." });
    const verification = await ProviderVerification.findOneAndUpdate(
      { owner: req.user.id },
      { $set: { businessName, country, website, businessEmail, registrationType, publicDescription, status: "Pending review", reviewNote: "", reviewedBy: null, reviewedAt: null } },
      { new: true, upsert: true, runValidators: true }
    ).select("businessName country website businessEmail registrationType publicDescription status reviewNote createdAt updatedAt").lean();
    res.status(201).json({ verification, message: "Verification request submitted for manual review." });
  } catch (error) { next(error); }
});

// Transparent first-stage matching: relevance scoring, not an external AI model.
const matchTokens = value => cleanText(value, 300)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[^a-z0-9\\s]/g, " ")
  .split(/\\s+/)
  .filter(token => token.length > 2);
router.get("/marketplace/recommendations", async (req, res, next) => {
  try {
    const requirement = cleanText(req.query.requirement, 300);
    if (requirement.length < 3) {
      return res.status(400).json({ message: "Describe your requirement in at least 3 characters." });
    }
    const requestedDepartment = cleanText(req.query.department, 80);
    const tokens = [...new Set(matchTokens(requirement))];
    if (!tokens.length) return res.json({ recommendations: [], method: "transparent-keyword-v1" });
    const filter = { status: "active" };
    if (marketplaceDepartments.includes(requestedDepartment)) filter.department = requestedDepartment;
    const candidates = await ServiceListing.find(filter)
      .select("title department category description country priceFrom currency createdAt")
      .sort({ createdAt: -1 }).limit(1000).lean();
    const recommendations = candidates.map(listing => {
      const fields = {
        title: matchTokens(listing.title),
        category: matchTokens(listing.category),
        department: matchTokens(listing.department),
        description: matchTokens(listing.description)
      };
      const matched = tokens.filter(token =>
        fields.title.includes(token) || fields.category.includes(token) ||
        fields.department.includes(token) || fields.description.includes(token)
      );
      const titleHits = tokens.filter(token => fields.title.includes(token)).length;
      const categoryHits = tokens.filter(token => fields.category.includes(token)).length;
      const departmentHits = tokens.filter(token => fields.department.includes(token)).length;
      const descriptionHits = tokens.filter(token => fields.description.includes(token)).length;
      const score = Math.min(100, Math.round(
        (titleHits * 28 + categoryHits * 22 + departmentHits * 18 + descriptionHits * 8) /
        Math.max(1, tokens.length) + (matched.length === tokens.length ? 10 : 0)
      ));
      const reasons = [];
      if (titleHits) reasons.push("Matches service title");
      if (categoryHits) reasons.push("Matches speciality");
      if (departmentHits) reasons.push("Matches department");
      if (descriptionHits) reasons.push("Matches description");
      return {
        _id: listing._id, title: listing.title, department: listing.department,
        category: listing.category, description: listing.description, country: listing.country,
        priceFrom: listing.priceFrom, currency: listing.currency, matchScore: score, matchReasons: reasons
      };
    }).filter(item => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);
    res.json({ recommendations, method: "transparent-keyword-v1", disclaimer: "Relevance estimate based on listing text; not a guarantee of quality or provider verification." });
  } catch (error) { next(error); }
});

export default router;
