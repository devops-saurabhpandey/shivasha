/**
 * Resolve the public web hostname to one of the four Shivasha frontends.
 *
 * Hostname routing selects a frontend entry point only. It is NOT an
 * authentication or authorization boundary. API access must continue to use
 * authenticated, server-side product membership checks.
 *
 * Override the example hostnames with SHIVASHA_*_HOST environment variables
 * when the production DNS zone is configured.
 */
const DEFAULT_PRODUCT_HOSTS = Object.freeze({
  social: "social.shivasha.com",
  business: "business.shivasha.com",
  edutech: "edutech.shivasha.com",
  enterprise: "enterprise.shivasha.com"
});

const ENTRY_FILES = Object.freeze({
  social: "index.html",
  business: "business.html",
  edutech: "edutech.html",
  enterprise: "enterprise.html"
});

export function normalizeHostname(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function getProductHostMap(env = process.env) {
  return Object.freeze({
    social: normalizeHostname(env.SHIVASHA_SOCIAL_HOST || DEFAULT_PRODUCT_HOSTS.social),
    business: normalizeHostname(env.SHIVASHA_BUSINESS_HOST || DEFAULT_PRODUCT_HOSTS.business),
    edutech: normalizeHostname(env.SHIVASHA_EDUTECH_HOST || DEFAULT_PRODUCT_HOSTS.edutech),
    enterprise: normalizeHostname(env.SHIVASHA_ENTERPRISE_HOST || DEFAULT_PRODUCT_HOSTS.enterprise)
  });
}

export function resolveProductDomain(host, env = process.env) {
  const hostname = normalizeHostname(host);
  if (!hostname) return null;

  const matches = Object.entries(getProductHostMap(env))
    .filter(([, configuredHost]) => configuredHost && configuredHost === hostname)
    .map(([productId]) => productId);

  // Ambiguous host configuration must fail closed rather than selecting an app.
  return matches.length === 1 ? matches[0] : null;
}

export function getProductEntryFile(productId) {
  return ENTRY_FILES[productId] || null;
}

export function getProductEntryForHost(host, env = process.env) {
  const productId = resolveProductDomain(host, env);
  return productId ? Object.freeze({
    productId,
    entryFile: getProductEntryFile(productId)
  }) : null;
}
