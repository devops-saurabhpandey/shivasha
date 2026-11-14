/**
 * Source-backed Indian payroll rule metadata.
 *
 * Only the EPF mandatory-coverage wage ceiling is configured here. This is
 * not a full PF contribution/eligibility calculator and must not be confused
 * with the PF wage definition or an employee's existing membership status.
 */
import { resolveStatutoryRule } from "./statutoryRuleConfig.js";

export const INDIA_EPF_COVERAGE_CEILING_RULES = [
  {
    country: "IN",
    jurisdiction: "IN",
    domain: "PF",
    ruleCode: "MANDATORY_COVERAGE_WAGE_CEILING",
    effectiveFrom: "2014-09-01",
    effectiveTo: "2026-09-17",
    status: "approved",
    value: { monthlyWageCeiling: 15000, currency: "INR", unit: "month" },
    sources: [
      "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2310973&lang=2&reg=48"
    ],
    note: "Previous ceiling; historical reference only. Verify the applicable law for the payroll period."
  },
  {
    country: "IN",
    jurisdiction: "IN",
    domain: "PF",
    ruleCode: "MANDATORY_COVERAGE_WAGE_CEILING",
    effectiveFrom: "2026-09-17",
    effectiveTo: null,
    status: "approved",
    value: { monthlyWageCeiling: 25000, currency: "INR", unit: "month" },
    sources: [
      "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2310973&lang=2&reg=48",
      "https://www.labour.gov.in/static/uploads/2026/11/da640b1558a315e81e22ce5ac12f463f.pdf"
    ],
    note: "S.O. 5109(E), Gazette notification dated 17 September 2026."
  }
];

export function getIndiaEpFMandatoryCoverageCeiling(asOf) {
  const rule = resolveStatutoryRule(INDIA_EPF_COVERAGE_CEILING_RULES, {
    country: "IN",
    jurisdiction: "IN",
    domain: "PF",
    ruleCode: "MANDATORY_COVERAGE_WAGE_CEILING",
    asOf
  });
  return { ...rule.value, effectiveFrom: rule.effectiveFrom, sourceReferences: rule.sources };
}
