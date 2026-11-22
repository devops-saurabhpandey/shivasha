import test from "node:test";
import assert from "node:assert/strict";
import buildAffiliateRiskSignals from "../utils/affiliateRiskSignals.js";

test("returns no risk signals for ordinary verified-looking activity", () => {
  assert.deepEqual(buildAffiliateRiskSignals({ grossAmount: 2500, ratePercent: 10, clicksLastHour: 25, buyerConversionsLastDay: 1 }), []);
});

test("flags high transaction value, unusual rate, click spike and buyer burst independently", () => {
  const signals = buildAffiliateRiskSignals({ grossAmount: 500000, ratePercent: 31, clicksLastHour: 1000, buyerConversionsLastDay: 3 });
  assert.deepEqual(signals.map(item => item.code), ["high_transaction_value", "unusual_commission_rate", "click_spike", "buyer_conversion_burst"]);
  assert.ok(signals.every(item => item.severity === "review"));
});

test("does not treat missing or malformed activity counts as suspicious", () => {
  assert.deepEqual(buildAffiliateRiskSignals({ grossAmount: 100, ratePercent: 5, clicksLastHour: "unknown", buyerConversionsLastDay: null }), []);
});

test("risk signals are advisory and contain no automatic action", () => {
  const signals = buildAffiliateRiskSignals({ grossAmount: 700000 });
  assert.ok(signals.every(item => !("action" in item) && !("blocked" in item)));
});
