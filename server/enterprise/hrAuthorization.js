import mongoose from "mongoose";
import { hasCompanyPermission } from "./companyConfig.js";

/**
 * Resolve the least-privilege permission required by an HR API request.
 * The caller must still verify an active company membership from MongoDB.
 */
export function getHRPermission(method, path) {
  const verb = String(method || "").toUpperCase();
  const route = String(path || "").split("?")[0];
  if (verb === "GET") {
    return /^(?:\/payroll-runs|\/challans)(?:\/|$)/.test(route)
      ? "hr.payroll.prepare"
      : "hr.employee.read";
  }
  if (verb === "PATCH" && /^\/payroll-runs\/[^/]+\/status$/.test(route)) {
    return "hr.payroll.approve";
  }
  if (/^(?:\/payroll-runs|\/challans)(?:\/|$)/.test(route)) {
    return "hr.payroll.prepare";
  }
  return "hr.employee.manage";
}

/**
 * Builds middleware that trusts only a company membership loaded from storage.
 * Client-supplied roles, permissions and JWT company claims are never trusted.
 */
export function createHRCompanyAuthorizationMiddleware({ CompanyModel, MembershipModel }) {
  return async function requireHRCompany(req, res, next) {
    const companyId = String(req.get?.("x-company-id") || req.headers?.["x-company-id"] || "");
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ message: "Select a company and send its ID in the X-Company-ID header" });
    }
    try {
      const [company, membership] = await Promise.all([
        CompanyModel.findById(companyId).select("_id status").lean(),
        MembershipModel.findOne({ companyId, userId: req.user.id, status: "active" }).lean()
      ]);
      if (!company || company.status !== "active") {
        return res.status(404).json({ message: "Company not found or inactive" });
      }
      const permission = getHRPermission(req.method, req.path);
      if (!membership || !hasCompanyPermission(membership, companyId, permission)) {
        return res.status(403).json({ message: "You do not have permission for this HR action in the selected company" });
      }
      req.companyId = company._id;
      req.companyMembership = membership;
      req.hrRole = membership.role;
      return next();
    } catch {
      return res.status(500).json({ message: "Could not verify company HR permissions" });
    }
  };
}
