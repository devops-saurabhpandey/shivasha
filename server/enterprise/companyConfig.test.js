import test from "node:test";
import assert from "node:assert/strict";
import {
  getRolePermissions,
  hasCompanyPermission,
  normalizeCompanyProfile,
  validateCompanyProfile
} from "./companyConfig.js";

const validProfile = {
  name: "Shivasha Technologies",
  legalName: "Shivasha Technologies Private Limited",
  entityType: "private_limited",
  countryCode: "in",
  functionalCurrency: "inr",
  reportingCurrency: "INR",
  fiscalYearStartMonth: 4,
  timeZone: "Asia/Kolkata",
  taxJurisdictions: ["IN-UP", "IN-CENTRAL"]
};

test("valid company profile is normalized and versioned", () => {
  const profile = normalizeCompanyProfile(validProfile);
  assert.equal(profile.countryCode, "IN");
  assert.equal(profile.functionalCurrency, "INR");
  assert.equal(profile.fiscalYearStartMonth, 4);
  assert.equal(profile.configurationVersion, 1);
  assert.deepEqual(profile.taxJurisdictions, ["IN-UP", "IN-CENTRAL"]);
});

test("company profile rejects missing legal identity and invalid codes", () => {
  const result = validateCompanyProfile({
    ...validProfile,
    legalName: "",
    countryCode: "IND",
    functionalCurrency: "RUPEE",
    fiscalYearStartMonth: 13,
    timeZone: "India"
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 5);
});

test("normalizer throws structured validation errors", () => {
  assert.throws(
    () => normalizeCompanyProfile({ ...validProfile, entityType: "unknown" }),
    error => error instanceof TypeError && error.validationErrors.length > 0
  );
});

test("HR manager cannot post finance ledger or approve tax returns", () => {
  const membership = { companyId: "company-1", role: "hr_manager", status: "active" };
  assert.equal(hasCompanyPermission(membership, "company-1", "hr.employee.manage"), true);
  assert.equal(hasCompanyPermission(membership, "company-1", "finance.ledger.post"), false);
  assert.equal(hasCompanyPermission(membership, "company-1", "tax.returns.approve"), false);
});

test("membership must be active and scoped to the requested company", () => {
  const membership = { companyId: "company-1", role: "company_owner", status: "active" };
  assert.equal(hasCompanyPermission(membership, "company-2", "finance.ledger.post"), false);
  assert.equal(hasCompanyPermission({ ...membership, status: "suspended" }, "company-1", "finance.ledger.post"), false);
  assert.equal(hasCompanyPermission(null, "company-1", "finance.ledger.post"), false);
});

test("platform admin bypass requires explicit platform scope", () => {
  assert.equal(hasCompanyPermission({ companyId: "x", role: "platform_admin" }, "company-2", "audit.export"), false);
  assert.equal(hasCompanyPermission({ companyId: "x", role: "platform_admin", platformScope: true, status: "active" }, "company-2", "audit.export"), true);
});

test("unknown roles receive no permissions", () => {
  assert.deepEqual(getRolePermissions("unknown_role"), []);
});

test("UTC is accepted as a valid IANA time-zone identifier", () => {
  const profile = normalizeCompanyProfile({ ...validProfile, timeZone: "UTC" });
  assert.equal(profile.timeZone, "UTC");
});

test("unsupported currency codes are rejected", () => {
  const result = validateCompanyProfile({ ...validProfile, functionalCurrency: "ZZZ" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes("functionalCurrency")));
});
