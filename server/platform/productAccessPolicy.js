/**
 * Pure, fail-closed product membership policy.
 *
 * This is a policy primitive only. It is deliberately not wired into routes
 * until every route's product and tenant scope has been audited.
 */
export function evaluateProductAccess({ membership, productId, tenantId = null, permission = null }) {
  if (!membership) return { allowed: false, reason: "membership_required" };
  if (membership.status !== "active") return { allowed: false, reason: "membership_inactive" };
  if (membership.productId !== productId) return { allowed: false, reason: "product_mismatch" };

  const membershipTenantId = membership.tenantId == null ? null : String(membership.tenantId);
  const requestedTenantId = tenantId == null ? null : String(tenantId);
  if (membershipTenantId !== requestedTenantId) {
    return { allowed: false, reason: "tenant_mismatch" };
  }

  if (permission && (!Array.isArray(membership.permissions) || !membership.permissions.includes(permission))) {
    return { allowed: false, reason: "permission_required" };
  }

  return { allowed: true, reason: "allowed" };
}
