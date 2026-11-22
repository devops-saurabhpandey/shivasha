import test from "node:test";
import assert from "node:assert/strict";
import {
  SHIVASHA_APPS,
  SHARED_PLATFORM_FEATURES,
  getAppForFeature,
  getFeatureOwner,
  getFeaturesForApp
} from "./productNavigation.js";

test("defines the four independent Shivasha product identities", () => {
  assert.deepEqual(Object.keys(SHIVASHA_APPS), [
    "social", "business", "edutech", "enterprise"
  ]);
});

test("maps representative existing features to their intended app", () => {
  assert.equal(getFeatureOwner("home"), "social");
  assert.equal(getFeatureOwner("crm"), "business");
  assert.equal(getFeatureOwner("learning-academy"), "edutech");
  assert.equal(getFeatureOwner("money-management"), "enterprise");
});

test("keeps shared platform features outside product ownership", () => {
  for (const feature of SHARED_PLATFORM_FEATURES) {
    assert.equal(getFeatureOwner(feature), "shared");
    assert.equal(getAppForFeature(feature), null);
  }
});

test("returns an empty feature list for an unknown app", () => {
  assert.deepEqual(getFeaturesForApp("unknown"), []);
});

test("does not expose mutable product feature arrays", () => {
  for (const app of Object.values(SHIVASHA_APPS)) {
    assert.equal(Object.isFrozen(app), true);
    assert.equal(Object.isFrozen(app.features), true);
  }
});
