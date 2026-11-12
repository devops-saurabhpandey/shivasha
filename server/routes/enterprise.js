import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { requireCompanyPermission } from "../middleware/requireCompanyPermission.js";
import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import EnterpriseAuditEvent from "../models/EnterpriseAuditEvent.js";
import User from "../models/User.js";
import { normalizeCompanyProfile, COMPANY_ENTITY_TYPES } from "../enterprise/companyConfig.js";

const router = Router();
router.use(requireAuth);

const ASSIGNABLE_ROLES = ["company_admin", "hr_manager", "finance_manager", "accountant", "auditor", "employee", "read_only"];
const clean = (value, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";

async function writeAudit({ companyId, actorUserId, action, resourceType, resourceId, details = {} }) {
  return EnterpriseAuditEvent.create({ companyId, actorUserId, action, resourceType, resourceId: String(resourceId), details });
}

router.get("/companies", async (req, res) => {
  try {
    const memberships = await CompanyMembership.find({ userId: req.user.id, status: "active" })
      .populate({ path: "companyId", match: { status: "active" } })
      .sort({ createdAt: -1 }).lean();
    res.json({
      companies: memberships.filter(item => item.companyId).map(item => ({
        company: item.companyId,
        membership: { role: item.role, status: item.status, joinedAt: item.joinedAt }
      }))
    });
  } catch {
    res.status(500).json({ message: "Could not load your company memberships" });
  }
});

router.post("/companies", async (req, res) => {
  let company;
  let membership;
  try {
    const profile = normalizeCompanyProfile(req.body || {});
    company = await Company.create({ ...profile, createdBy: req.user.id });
    membership = await CompanyMembership.create({
      companyId: company._id, userId: req.user.id, role: "company_owner",
      status: "active", invitedBy: req.user.id
    });
    await writeAudit({
      companyId: company._id, actorUserId: req.user.id,
      action: "company.created", resourceType: "company", resourceId: company._id,
      details: { entityType: company.entityType, countryCode: company.countryCode }
    });
    return res.status(201).json({ company, membership: { role: membership.role, status: membership.status } });
  } catch (error) {
    // Best-effort compensation avoids leaving an unowned tenant if onboarding fails.
    if (company?._id) {
      await Promise.allSettled([
        CompanyMembership.deleteMany({ companyId: company._id }),
        EnterpriseAuditEvent.deleteMany({ companyId: company._id }),
        Company.deleteOne({ _id: company._id })
      ]);
    }
    if (error?.code === 11000) return res.status(409).json({ message: "Company membership already exists" });
    if (error?.validationErrors) return res.status(400).json({ message: "Invalid company profile", errors: error.validationErrors });
    if (error instanceof mongoose.Error.ValidationError || error instanceof TypeError) {
      return res.status(400).json({ message: "Invalid company profile", errors: Object.values(error.errors || {}).map(item => item.message).concat(error.validationErrors || []) });
    }
    return res.status(500).json({ message: "Could not create company" });
  }
});

router.get("/companies/:companyId", requireCompanyPermission("company.profile.read"), async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).lean();
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json({ company, membership: { role: req.companyMembership.role } });
  } catch {
    res.status(500).json({ message: "Could not load company profile" });
  }
});

router.patch("/companies/:companyId", requireCompanyPermission("company.profile.manage"), async (req, res) => {
  const allowed = ["name", "legalName", "entityType", "countryCode", "functionalCurrency", "reportingCurrency", "fiscalYearStartMonth", "timeZone", "taxJurisdictions"];
  const changes = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (Object.keys(changes).length === 0) return res.status(400).json({ message: "No supported company profile fields supplied" });
  try {
    const current = await Company.findById(req.params.companyId).lean();
    if (!current) return res.status(404).json({ message: "Company not found" });
    const profile = normalizeCompanyProfile({ ...current, ...changes });
    const updated = await Company.findOneAndUpdate(
      { _id: current._id, configurationVersion: current.configurationVersion },
      { $set: profile, $inc: { configurationVersion: 1 } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(409).json({ message: "Company settings changed concurrently. Reload and retry." });
    await writeAudit({
      companyId: updated._id, actorUserId: req.user.id,
      action: "company.profile.updated", resourceType: "company", resourceId: updated._id,
      details: { fields: Object.keys(changes), configurationVersion: updated.configurationVersion }
    });
    res.json({ company: updated });
  } catch (error) {
    if (error?.validationErrors) return res.status(400).json({ message: "Invalid company profile", errors: error.validationErrors });
    if (error instanceof mongoose.Error.ValidationError || error instanceof TypeError) {
      return res.status(400).json({ message: "Invalid company profile", errors: Object.values(error.errors || {}).map(item => item.message).concat(error.validationErrors || []) });
    }
    res.status(500).json({ message: "Could not update company profile" });
  }
});

router.get("/companies/:companyId/members", requireCompanyPermission("company.members.manage"), async (req, res) => {
  try {
    const members = await CompanyMembership.find({ companyId: req.params.companyId })
      .populate("userId", "name email").sort({ createdAt: 1 }).lean();
    res.json({ members: members.map(item => ({
      id: item._id, user: item.userId, role: item.role, status: item.status,
      joinedAt: item.joinedAt
    })) });
  } catch {
    res.status(500).json({ message: "Could not load company members" });
  }
});

router.post("/companies/:companyId/members", requireCompanyPermission("company.members.manage"), async (req, res) => {
  const email = clean(req.body?.email, 160).toLowerCase();
  const role = clean(req.body?.role, 40);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "A valid registered user email is required" });
  if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ message: "Unsupported company role" });
  if (role === "company_admin" && req.companyMembership.role !== "company_owner") {
    return res.status(403).json({ message: "Only the company owner can appoint a company admin" });
  }
  try {
    const user = await User.findOne({ email }).select("_id name email").lean();
    if (!user) return res.status(404).json({ message: "User must register with SHIVASHA before being added" });
    const membership = await CompanyMembership.create({
      companyId: req.params.companyId, userId: user._id, role,
      status: "active", invitedBy: req.user.id
    });
    await writeAudit({
      companyId: req.params.companyId, actorUserId: req.user.id,
      action: "company.member.added", resourceType: "membership", resourceId: membership._id,
      details: { role }
    });
    res.status(201).json({ member: { id: membership._id, user, role, status: membership.status } });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "This user is already a member of the company" });
    res.status(500).json({ message: "Could not add company member" });
  }
});

router.patch("/companies/:companyId/members/:memberId", requireCompanyPermission("company.members.manage"), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.memberId)) return res.status(400).json({ message: "Invalid membership ID" });
  const updates = {};
  if (req.body?.status !== undefined) {
    if (!["active", "suspended"].includes(req.body.status)) return res.status(400).json({ message: "Invalid membership status" });
    updates.status = req.body.status;
  }
  if (req.body?.role !== undefined) {
    if (!ASSIGNABLE_ROLES.includes(req.body.role)) return res.status(400).json({ message: "Unsupported company role" });
    if (req.body.role === "company_admin" && req.companyMembership.role !== "company_owner") {
      return res.status(403).json({ message: "Only the company owner can appoint a company admin" });
    }
    updates.role = req.body.role;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide a role or status change" });
  try {
    const target = await CompanyMembership.findOne({ _id: req.params.memberId, companyId: req.params.companyId });
    if (!target) return res.status(404).json({ message: "Company member not found" });
    if (target.role === "company_owner") return res.status(409).json({ message: "Owner membership cannot be changed through this endpoint" });
    if (target.userId.toString() === req.user.id && updates.status === "suspended") {
      return res.status(400).json({ message: "You cannot suspend your own membership" });
    }
    const before = { role: target.role, status: target.status };
    Object.assign(target, updates);
    await target.save();
    await writeAudit({
      companyId: req.params.companyId, actorUserId: req.user.id,
      action: "company.member.updated", resourceType: "membership", resourceId: target._id,
      details: { before, after: { role: target.role, status: target.status } }
    });
    res.json({ member: { id: target._id, userId: target.userId, role: target.role, status: target.status } });
  } catch {
    res.status(500).json({ message: "Could not update company member" });
  }
});

router.get("/companies/:companyId/audit-events", requireCompanyPermission("audit.read"), async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const before = req.query.before ? new Date(req.query.before) : null;
  if (before && Number.isNaN(before.getTime())) return res.status(400).json({ message: "Invalid before timestamp" });
  try {
    const filter = { companyId: req.params.companyId };
    if (before) filter.occurredAt = { $lt: before };
    const events = await EnterpriseAuditEvent.find(filter)
      .sort({ occurredAt: -1, _id: -1 }).limit(limit)
      .populate("actorUserId", "name email").lean();
    res.json({ events, nextBefore: events.length === limit ? events[events.length - 1].occurredAt : null });
  } catch {
    res.status(500).json({ message: "Could not load audit events" });
  }
});

export default router;
