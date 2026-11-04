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

export default router;
