import test from "node:test";
import assert from "node:assert/strict";
import { getIndiaEpFMandatoryCoverageCeiling } from "../../src/indiaPayrollRules.js";

test("India EPF mandatory coverage ceiling uses historical effective dates", () => {
  const beforeChange = getIndiaEpFMandatoryCoverageCeiling("2026-09-16");
  assert.equal(beforeChange.monthlyWageCeiling, 15000);
  assert.equal(beforeChange.effectiveFrom, "2014-09-01");

  const changeDate = getIndiaEpFMandatoryCoverageCeiling("2026-09-17");
  assert.equal(changeDate.monthlyWageCeiling, 25000);
  assert.equal(changeDate.effectiveFrom, "2026-09-17");
  assert.ok(changeDate.sourceReferences.some(url => url.includes("pib.gov.in")));
});

test("India EPF ceiling rule rejects invalid payroll dates", () => {
  assert.throws(() => getIndiaEpFMandatoryCoverageCeiling("2026-02-30"), /real calendar date/);
});
