import ProductMembership from "../models/ProductMembership.js";
import { evaluateProductAccess } from "../platform/productAccessPolicy.js";

const PRODUCT_IDS = new Set(["social", "business", "edutech", "enterprise"]);

/**
 * Opt-in product authorization middleware.
 * Mount after requireAuth. Tenant routes MUST provide a trusted server-side
 * tenantResolver; never pass req.body or an unverified client tenant ID.
 */
export function requireProductAccess({
  productId,
  permission = null,
  tenantResolver = null,
  membershipModel = ProductMembership,
  clock = () => new Date()
} = {}) {
  if (!PRODUCT_IDS.has(productId)) {
    throw new TypeError("A valid productId is required");
  }
  if (tenantResolver !== null && typeof tenantResolver !== "function") {
    throw new TypeError("tenantResolver must be a function");
  }

  return async function productAccessMiddleware(req, res, next) {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      let tenantId = null;
      if (tenantResolver) {
        tenantId = await tenantResolver(req);
        if (tenantId === null || tenantId === undefined || tenantId === "") {
          return res.status(403).json({ message: "A verified tenant context is required" });
        }
      }

      const now = clock();
      const membership = await membershipModel.findOne({
        userId,
        productId,
        tenantId,
        status: "active",
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
      });

      const decision = evaluateProductAccess({
        membership,
        productId,
        tenantId,
        permission,
        now
      });

      if (!decision.allowed) {
        return res.status(403).json({
          message: "Product access denied",
          reason: decision.reason
        });
      }

      req.productAccess = Object.freeze({
        productId,
        tenantId,
        role: membership.role,
        permissions: Array.isArray(membership.permissions) ? [...membership.permissions] : []
      });
      return next();
    } catch {
      // A database or tenant-resolution failure must never grant access.
      return res.status(503).json({ message: "Product access could not be verified" });
    }
  };
}

export default requireProductAccess;
