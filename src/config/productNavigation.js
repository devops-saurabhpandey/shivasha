/**
 * Canonical frontend ownership map for the four Shivasha applications.
 *
 * This is descriptive navigation metadata only. It does not authenticate users,
 * grant permissions, hide sensitive data, or replace server-side authorization.
 * Existing App.jsx navigation remains unchanged until a separately reviewed
 * integration step proves route compatibility.
 */

export const SHIVASHA_APPS = Object.freeze({
  social: Object.freeze({
    id: "social",
    name: "Shivasha Social",
    description: "Profiles, community, posts, messaging and creator experiences.",
    features: Object.freeze([
      "home", "discover", "create", "messages", "saved", "profile",
      "user-profile", "post-detail", "hashtag", "live",
      "content-studio", "cinematic-studio", "youtube-automation",
      "creator-earnings"
    ])
  }),
  business: Object.freeze({
    id: "business",
    name: "Shivasha Business",
    description: "Business discovery, commerce, customer acquisition and growth.",
    features: Object.freeze([
      "business-platform", "sales-agent", "ad-network", "crm", "ecommerce",
      "business-law-ai", "marketing", "customer-finder", "visitors-attractor",
      "ui-ux-designer", "software-hub", "affiliate-center"
    ])
  }),
  edutech: Object.freeze({
    id: "edutech",
    name: "Shivasha Edutech",
    description: "Learning, courses, knowledge resources and educational tools.",
    features: Object.freeze([
      "houses", "science", "technology", "current-affairs", "global-education",
      "learning-academy", "wisdom", "japanese-wisdom", "daily-dev-stuti",
      "motivation", "pooja-book", "hindu-calendar", "government-schemes",
      "ayurveda-ai", "astro-career"
    ])
  }),
  enterprise: Object.freeze({
    id: "enterprise",
    name: "Shivasha Enterprise",
    description: "Company operations, people, finance, reporting and administration.",
    features: Object.freeze([
      "hr", "mis", "admin", "tax-calculators", "money-management"
    ])
  })
});

export const SHARED_PLATFORM_FEATURES = Object.freeze([
  "my-plan",
  "ai-assistant",
  "prompt-library"
]);

const featureOwners = new Map();
for (const app of Object.values(SHIVASHA_APPS)) {
  for (const feature of app.features) {
    if (featureOwners.has(feature)) {
      throw new Error(`Duplicate Shivasha feature ownership: ${feature}`);
    }
    featureOwners.set(feature, app.id);
  }
}

export function getAppForFeature(featureId) {
  const appId = featureOwners.get(featureId);
  return appId ? SHIVASHA_APPS[appId] : null;
}

export function getFeatureOwner(featureId) {
  return featureOwners.get(featureId) ?? (
    SHARED_PLATFORM_FEATURES.includes(featureId) ? "shared" : null
  );
}

export function getFeaturesForApp(appId) {
  return SHIVASHA_APPS[appId]?.features ?? [];
}
