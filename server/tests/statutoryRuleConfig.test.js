import test from "node:test";
import assert from "node:assert/strict";
import {
  validateStatutoryRule, validateStatutoryRuleSet, resolveStatutoryRule
} from "../../src/statutoryRuleConfig.js";

const approved = (overrides = {}) => ({
  country: "IN", jurisdiction: "IN-UP", domain: "PROFESSIONAL_TAX",
  ruleCode: "MONTHLY_SLAB", effectiveFrom: "2026-04-01",
  effectiveTo: "2027-04-01", status: "approved",
  value: { slabs: [{ upTo: 10000, amount: 0 }] },
  sources: ["https://example.gov.in/official-notification"],
  ...overrides
});

test("statutory rule requires explicit jurisdiction, source and valid effective dates", () => {
  assert.equal(validateStatutoryRule(approved()).jurisdiction, "IN-UP");
  assert.throws(() => validateStatutoryRule(approved({ jurisdiction: "" })), /Jurisdiction is required/);
  assert.throws(() => validateStatutoryRule(approved({ sources: [] })), /HTTPS source/);
  assert.throws(() => validateStatutoryRule(approved({ sources: ["http://example.com"] })), /HTTPS source/);
  assert.throws(() => validateStatutoryRule(approved({ effectiveFrom: "2026-02-30" })), /real calendar date/);
  assert.throws(() => validateStatutoryRule(approved({ effectiveTo: "2026-04-01" })), /later than/);
  assert.throws(() => validateStatutoryRule(approved({ domain: "UNKNOWN" })), /Unsupported statutory/);
});

test("rule sets allow adjacent effective periods but reject overlaps", () => {
  const first = approved({ effectiveTo: "2027-04-01" });
  const second = approved({ effectiveFrom: "2027-04-01", effectiveTo: null, value: { slabs: [] } });
  assert.equal(validateStatutoryRuleSet([first, second]).length, 2);
  assert.throws(() => validateStatutoryRuleSet([
    first, approved({ effectiveFrom: "2027-03-01", effectiveTo: null })
  ]), /Overlapping effective dates/);
});

test("resolver selects only approved rules for exact jurisdiction and inclusive start/exclusive end", () => {
  const rules = [
    approved({ status: "draft" }),
    approved({ effectiveTo: "2027-04-01" }),
    approved({ effectiveFrom: "2027-04-01", effectiveTo: null, value: { slabs: [{ upTo: null, amount: 200 }] } })
  ];
  const start = resolveStatutoryRule(rules, {
    country: "IN", jurisdiction: "IN-UP", domain: "PROFESSIONAL_TAX",
    ruleCode: "MONTHLY_SLAB", asOf: "2026-04-01"
  });
  assert.equal(start.effectiveFrom, "2026-04-01");
  const next = resolveStatutoryRule(rules, {
    country: "IN", jurisdiction: "IN-UP", domain: "PROFESSIONAL_TAX",
    ruleCode: "MONTHLY_SLAB", asOf: "2027-04-01"
  });
  assert.equal(next.effectiveFrom, "2027-04-01");
});

test("resolver refuses missing rules and does not silently fall back to another state", () => {
  assert.throws(() => resolveStatutoryRule([approved()], {
    country: "IN", jurisdiction: "IN-DL", domain: "PROFESSIONAL_TAX",
    ruleCode: "MONTHLY_SLAB", asOf: "2026-05-01"
  }), /No approved rule exists/);
  assert.throws(() => resolveStatutoryRule([approved({ status: "draft" })], {
    country: "IN", jurisdiction: "IN-UP", domain: "PROFESSIONAL_TAX",
    ruleCode: "MONTHLY_SLAB", asOf: "2026-05-01"
  }), /No approved rule exists/);
});
