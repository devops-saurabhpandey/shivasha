import mongoose from "mongoose";
import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import { hasCompanyPermission } from "../enterprise/companyConfig.js";

/**
 * Authorization middleware. Membership is always loaded from MongoDB; a role,
 * company ID, or permission supplied by the client/JWT is never trusted.
 */
export function requireCompanyPermission(permission) {
  return async function companyPermissionMiddleware(req, res, next) {
    const companyId = String(req.params.companyId || req.body?.companyId || req.query?.companyId || "");
    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ message: "A valid companyId is required" });
    }

    try {
      const [company, membership] = await Promise.all([
        Company.findById(companyId).select("_id status").lean(),
        CompanyMembership.findOne({ companyId, userId: req.user.id, status: "active" }).lean()
      ]);
      if (!company || company.status !== "active") {
        return res.status(404).json({ message: "Company not found or inactive" });
      }
      if (!membership || !hasCompanyPermission(membership, companyId, permission)) {
        return res.status(403).json({ message: "You do not have permission for this company action" });
      }
      req.company = company;
      req.companyMembership = membership;
      next();
    } catch {
      return res.status(500).json({ message: "Could not verify company access" });
    }
  };
}
