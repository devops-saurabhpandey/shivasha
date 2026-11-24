const PRODUCT_IDS = Object.freeze(["social", "business", "edutech", "enterprise"]);

/**
 * Build a safe, read-only view of a user's application memberships.
 * This is discovery metadata, not an authorization decision. API routes must
 * still call requireProductAccess with a trusted tenant context where needed.
 */
export function buildSharedSession(memberships = [], now = new Date()) {
  const normalized = Array.isArray(memberships) ? memberships : [];

  return PRODUCT_IDS.map(productId => {
    const entries = normalized
      .filter(item => item && item.productId === productId)
      .map(item => {
        const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
        const expired = expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now);
        const active = item.status === "active" && !expired;
        const effectiveStatus = item.status === "active" && expired ? "expired" : (item.status || "inactive");

        return {
          role: typeof item.role === "string" ? item.role : null,
          status: active ? "active" : effectiveStatus,
          permissions: Array.isArray(item.permissions)
            ? item.permissions.filter(value => typeof value === "string")
            : [],
          tenantScoped: item.tenantId != null,
          expiresAt: expiresAt && Number.isFinite(expiresAt.getTime())
            ? expiresAt.toISOString()
            : null
        };
      });

    const hasActive = entries.some(entry => entry.status === "active");
    const hasAny = entries.length > 0;

    return Object.freeze({
      productId,
      membershipStatus: hasActive ? "active" : hasAny ? "inactive" : "not_enrolled",
      memberships: Object.freeze(entries)
    });
  });
}
