import test from "node:test";
import assert from "node:assert/strict";
import Company from "../models/Company.js";
import CompanyMembership from "../models/CompanyMembership.js";
import EnterpriseAuditEvent from "../models/EnterpriseAuditEvent.js";

const objectId = "507f1f77bcf86cd799439011";
const companyData = {
  name: "SHIVASHA Technologies",
  legalName: "SHIVASHA Technologies Private Limited",
  entityType: "private_limited",
  countryCode: "IN",
  functionalCurrency: "INR",
  reportingCurrency: "INR",
  fiscalYearStartMonth: 4,
  timeZone: "Asia/Kolkata",
  taxJurisdictions: ["IN-UP"],
  createdBy: objectId
};

test("company model accepts a complete India company profile", () => {
  const company = new Company(companyData);
  assert.equal(company.validateSync(), undefined);
  assert.equal(company.configurationVersion, 1);
  assert.equal(company.status, "active");
});

test("company model rejects missing legal identity and invalid fiscal month", () => {
  const company = new Company({ ...companyData, legalName: "", fiscalYearStartMonth: 13 });
  const error = company.validateSync();
  assert.ok(error);
  assert.ok(error.errors.legalName);
  assert.ok(error.errors.fiscalYearStartMonth);
});

test("company model restricts supported legal entity types", () => {
  const company = new Company({ ...companyData, entityType: "unregistered_magic_company" });
  assert.ok(company.validateSync()?.errors.entityType);
});

test("membership model only accepts known enterprise roles", () => {
  const valid = new CompanyMembership({
    companyId: objectId, userId: objectId, invitedBy: objectId,
    role: "finance_manager", status: "active"
  });
  assert.equal(valid.validateSync(), undefined);

  const invalid = new CompanyMembership({
    companyId: objectId, userId: objectId, invitedBy: objectId,
    role: "super_admin_from_client", status: "active"
  });
  assert.ok(invalid.validateSync()?.errors.role);
});

test("company membership has a unique company-user compound index", () => {
  const indexes = CompanyMembership.schema.indexes();
  assert.ok(indexes.some(([keys, options]) =>
    keys.companyId === 1 && keys.userId === 1 && options.unique === true
  ));
});

test("audit event identity and event fields are immutable in the Mongoose model", () => {
  for (const path of ["companyId", "actorUserId", "action", "resourceType", "resourceId", "details", "occurredAt"]) {
    assert.equal(EnterpriseAuditEvent.schema.path(path).options.immutable, true);
  }
});
