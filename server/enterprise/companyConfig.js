/**
 * SHIVASHA enterprise company configuration primitives.
 *
 * These pure helpers validate configuration and evaluate an already-loaded
 * membership. They do not replace database-backed tenant isolation or API
 * authorization middleware; callers must load membership from trusted storage.
 */

export const COMPANY_ENTITY_TYPES = Object.freeze([
  "private_limited",
  "public_limited",
  "government_department",
  "public_sector_undertaking",
  "partnership",
  "llp",
  "sole_proprietorship",
  "non_profit",
  "other"
]);

export const ENTERPRISE_PERMISSIONS = Object.freeze([
  "company.profile.read",
  "company.profile.manage",
  "company.members.manage",
  "company.settings.manage",
  "hr.employee.read",
  "hr.employee.manage",
  "hr.payroll.prepare",
  "hr.payroll.approve",
  "finance.ledger.read",
  "finance.ledger.post",
  "finance.period.close",
  "finance.bank.reconcile",
  "tax.records.read",
  "tax.returns.prepare",
  "tax.returns.approve",
  "audit.read",
  "audit.export"
]);

const ROLE_PERMISSIONS = Object.freeze({
  company_owner: ENTERPRISE_PERMISSIONS,
  company_admin: [
    "company.profile.read", "company.profile.manage", "company.members.manage",
    "company.settings.manage", "hr.employee.read", "hr.employee.manage",
    "hr.payroll.prepare", "hr.payroll.approve", "finance.ledger.read",
    "finance.ledger.post", "finance.period.close", "finance.bank.reconcile",
    "tax.records.read", "tax.returns.prepare", "tax.returns.approve",
    "audit.read", "audit.export"
  ],
  hr_manager: [
    "company.profile.read", "hr.employee.read", "hr.employee.manage",
    "hr.payroll.prepare", "hr.payroll.approve"
  ],
  finance_manager: [
    "company.profile.read", "finance.ledger.read", "finance.ledger.post",
    "finance.period.close", "finance.bank.reconcile", "tax.records.read",
    "tax.returns.prepare"
  ],
  accountant: [
    "company.profile.read", "finance.ledger.read", "finance.ledger.post",
    "finance.bank.reconcile", "tax.records.read", "tax.returns.prepare"
  ],
  auditor: [
    "company.profile.read", "hr.employee.read", "finance.ledger.read",
    "tax.records.read", "audit.read", "audit.export"
  ],
  employee: ["company.profile.read"],
  read_only: ["company.profile.read", "hr.employee.read", "finance.ledger.read", "tax.records.read"]
});

const text = value => typeof value === "string" ? value.trim() : "";
const isCode = (value, pattern) => pattern.test(value);

export function validateCompanyProfile(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["Company profile must be an object"] };
  }

  const name = text(input.name);
  const legalName = text(input.legalName);
  const entityType = text(input.entityType);
  const countryCode = text(input.countryCode).toUpperCase();
  const functionalCurrency = text(input.functionalCurrency).toUpperCase();
  const reportingCurrency = text(input.reportingCurrency || functionalCurrency).toUpperCase();
  const fiscalYearStartMonth = Number(input.fiscalYearStartMonth);
  const timeZone = text(input.timeZone);
  const taxJurisdictions = input.taxJurisdictions ?? [];

  if (!name || name.length > 160) errors.push("name is required and must be 160 characters or fewer");
  if (!legalName || legalName.length > 200) errors.push("legalName is required and must be 200 characters or fewer");
  if (!COMPANY_ENTITY_TYPES.includes(entityType)) errors.push("entityType is not supported");
  if (!isCode(countryCode, /^[A-Z]{2}$/)) errors.push("countryCode must be a 2-letter ISO country code");
  if (!isCode(functionalCurrency, /^[A-Z]{3}$/)) errors.push("functionalCurrency must be a 3-letter ISO currency code");
  if (!isCode(reportingCurrency, /^[A-Z]{3}$/)) errors.push("reportingCurrency must be a 3-letter ISO currency code");
  if (!Number.isInteger(fiscalYearStartMonth) || fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12) {
    errors.push("fiscalYearStartMonth must be an integer from 1 to 12");
  }
  if (!timeZone || timeZone.length > 80 || !timeZone.includes("/")) {
    errors.push("timeZone must be an IANA time-zone identifier such as Asia/Kolkata");
  }
  if (!Array.isArray(taxJurisdictions) || taxJurisdictions.length > 20 ||
      taxJurisdictions.some(code => typeof code !== "string" || !/^[A-Z0-9-]{2,12}$/.test(code.trim().toUpperCase()))) {
    errors.push("taxJurisdictions must be an array of up to 20 jurisdiction codes");
  }

  return { valid: errors.length === 0, errors };
}

export function normalizeCompanyProfile(input) {
  const result = validateCompanyProfile(input);
  if (!result.valid) {
    const error = new TypeError("Invalid company profile: " + result.errors.join("; "));
    error.validationErrors = result.errors;
    throw error;
  }

  return Object.freeze({
    name: text(input.name),
    legalName: text(input.legalName),
    entityType: text(input.entityType),
    countryCode: text(input.countryCode).toUpperCase(),
    functionalCurrency: text(input.functionalCurrency).toUpperCase(),
    reportingCurrency: text(input.reportingCurrency || input.functionalCurrency).toUpperCase(),
    fiscalYearStartMonth: Number(input.fiscalYearStartMonth),
    timeZone: text(input.timeZone),
    taxJurisdictions: Object.freeze((input.taxJurisdictions || []).map(code => code.trim().toUpperCase())),
    status: input.status === "inactive" ? "inactive" : "active",
    configurationVersion: 1
  });
}

/**
 * Checks an active membership already fetched from trusted server-side storage.
 * Company IDs are compared as strings to support Mongo ObjectId and string IDs.
 */
export function hasCompanyPermission(membership, companyId, permission) {
  if (!membership || membership.status !== "active" || !companyId || !permission) return false;
  if (String(membership.companyId) !== String(companyId)) return false;
  if (membership.role === "platform_admin" && membership.platformScope === true) return true;
  const permissions = ROLE_PERMISSIONS[membership.role];
  return Array.isArray(permissions) && permissions.includes(permission);
}

export function getRolePermissions(role) {
  return Object.freeze([...(ROLE_PERMISSIONS[role] || [])]);
}
