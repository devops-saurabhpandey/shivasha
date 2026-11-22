/**
 * Canonical product ownership metadata for the four Shivasha applications.
 *
 * This registry is descriptive only: it does not grant access or enforce
 * authorization. Product/tenant access must be checked by server middleware
 * and route handlers before sensitive data is read or changed.
 */
export const PRODUCT_IDS = Object.freeze({
  SOCIAL: "social",
  BUSINESS: "business",
  EDUTECH: "edutech",
  ENTERPRISE: "enterprise"
});

const freezeProduct = product => Object.freeze({
  ...product,
  frontendAreas: Object.freeze([...product.frontendAreas]),
  apiPrefixes: Object.freeze([...product.apiPrefixes])
});

export const PRODUCTS = Object.freeze([
  freezeProduct({
    id: PRODUCT_IDS.SOCIAL,
    name: "Shivasha Social",
    frontendAreas: [
      "feed", "posts", "profiles", "discover", "messages",
      "notifications", "live", "creator-earnings"
    ],
    apiPrefixes: ["/api/posts", "/api/messages", "/api/live-videos", "/api/creator-finance"]
  }),
  freezeProduct({
    id: PRODUCT_IDS.BUSINESS,
    name: "Shivasha Business",
    frontendAreas: [
      "business-platform", "crm", "ecommerce", "sales-agent",
      "marketing", "customer-finder", "visitors-attractor", "software-hub",
      "affiliate-center"
    ],
    apiPrefixes: [
      "/api/business-platform", "/api/business-ai", "/api/business",
      "/api/sales-agent", "/api/affiliates"
    ]
  }),
  freezeProduct({
    id: PRODUCT_IDS.EDUTECH,
    name: "Shivasha Edutech",
    frontendAreas: ["learning-academy", "global-education"],
    apiPrefixes: ["/api/education", "/api/learning"]
  }),
  freezeProduct({
    id: PRODUCT_IDS.ENTERPRISE,
    name: "Shivasha Enterprise",
    frontendAreas: ["hr", "mis", "money-management", "tax-calculators", "enterprise"],
    apiPrefixes: ["/api/enterprise", "/api/hr"]
  })
]);

const productById = new Map(PRODUCTS.map(product => [product.id, product]));

export function getProductById(productId) {
  return productById.get(productId) ?? null;
}

/**
 * Return the owning product for a product-specific API path.
 * Shared platform endpoints (auth, users, notifications, analytics, AI, etc.)
 * intentionally return null and are catalogued separately.
 */
export function getProductForApiPath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/")) return null;

  const matches = PRODUCTS.flatMap(product =>
    product.apiPrefixes
      .filter(prefix => pathname === prefix || pathname.startsWith(prefix + "/"))
      .map(prefix => ({ product, prefix }))
  ).sort((a, b) => b.prefix.length - a.prefix.length);

  return matches[0]?.product ?? null;
}
