/**
 * Effective-dated statutory configuration resolver.
 *
 * This module deliberately stores rule values as supplied configuration.
 * It contains no hard-coded tax or labour-law rates. A rule must cite its
 * authoritative source and be approved before it can be resolved for use.
 */
const SUPPORTED_RULE_DOMAINS = new Set([
  "PF", "EPS", "EDLI", "ESI", "PROFESSIONAL_TAX", "GST", "TDS", "INCOME_TAX",
  "GRATUITY", "BONUS", "LEAVE"
]);

function validDate(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(field + " must be an ISO date (YYYY-MM-DD)");
  }
  const date = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError(field + " is not a real calendar date");
  }
  return value;
}

function nonEmpty(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(field + " is required");
  }
  return value.trim();
}

export function validateStatutoryRule(rule) {
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
    throw new TypeError("Rule must be an object");
  }
  const domain = nonEmpty(rule.domain, "Rule domain").toUpperCase();
  if (!SUPPORTED_RULE_DOMAINS.has(domain)) {
    throw new RangeError("Unsupported statutory rule domain: " + domain);
  }
  const country = nonEmpty(rule.country, "Country").toUpperCase();
  const jurisdiction = nonEmpty(rule.jurisdiction, "Jurisdiction").toUpperCase();
  const ruleCode = nonEmpty(rule.ruleCode, "Rule code");
  const effectiveFrom = validDate(rule.effectiveFrom, "effectiveFrom");
  const effectiveTo = rule.effectiveTo == null ? null : validDate(rule.effectiveTo, "effectiveTo");
  if (effectiveTo && effectiveTo <= effectiveFrom) {
    throw new RangeError("effectiveTo must be later than effectiveFrom");
  }
  if (!Array.isArray(rule.sources) || rule.sources.length === 0 ||
      rule.sources.some(source => typeof source !== "string" || !/^https:\/\//i.test(source.trim()))) {
    throw new TypeError("At least one HTTPS source reference is required");
  }
  if (!["draft", "approved", "retired"].includes(rule.status)) {
    throw new RangeError("Rule status must be draft, approved or retired");
  }
  if (rule.value === undefined || rule.value === null) {
    throw new TypeError("Rule value is required");
  }
  return {
    ...rule,
    domain, country, jurisdiction, ruleCode, effectiveFrom, effectiveTo,
    sources: rule.sources.map(source => source.trim())
  };
}

/**
 * Validate a complete ruleset and reject overlapping active date ranges for
 * the same country/jurisdiction/domain/ruleCode. End dates are exclusive.
 */
export function validateStatutoryRuleSet(rules) {
  if (!Array.isArray(rules)) throw new TypeError("Ruleset must be an array");
  const normalized = rules.map(validateStatutoryRule);
  const groups = new Map();
  for (const rule of normalized) {
    // Draft and retired records are retained for review/history. Only
    // approved records must have mutually exclusive effective-date windows.
    if (rule.status !== "approved") continue;
    const key = [rule.country, rule.jurisdiction, rule.domain, rule.ruleCode].join("|");
    const group = groups.get(key) || [];
    group.push(rule);
    groups.set(key, group);
  }
  for (const [key, group] of groups) {
    group.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    for (let index = 1; index < group.length; index += 1) {
      const previous = group[index - 1];
      const current = group[index];
      if (previous.effectiveTo === null || current.effectiveFrom < previous.effectiveTo) {
        throw new RangeError("Overlapping effective dates for rule " + key);
      }
    }
  }
  return normalized;
}

/**
 * Resolve exactly one approved rule for the requested date. The caller must
 * supply an explicit jurisdiction; there is no silent country-wide fallback.
 */
export function resolveStatutoryRule(rules, query) {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    throw new TypeError("Rule query must be an object");
  }
  const country = nonEmpty(query.country, "Country").toUpperCase();
  const jurisdiction = nonEmpty(query.jurisdiction, "Jurisdiction").toUpperCase();
  const domain = nonEmpty(query.domain, "Rule domain").toUpperCase();
  const ruleCode = nonEmpty(query.ruleCode, "Rule code");
  const asOf = validDate(query.asOf, "asOf");
  const matching = validateStatutoryRuleSet(rules).filter(rule =>
    rule.country === country &&
    rule.jurisdiction === jurisdiction &&
    rule.domain === domain &&
    rule.ruleCode === ruleCode &&
    rule.status === "approved" &&
    rule.effectiveFrom <= asOf &&
    (rule.effectiveTo === null || asOf < rule.effectiveTo)
  );
  if (matching.length !== 1) {
    throw new RangeError(matching.length === 0
      ? "No approved rule exists for the requested jurisdiction and date"
      : "More than one approved rule matches the requested jurisdiction and date");
  }
  return matching[0];
}
