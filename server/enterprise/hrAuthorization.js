/**
 * Resolve the least-privilege permission required by an HR API request.
 * The caller must still verify an active company membership from MongoDB.
 */
export function getHRPermission(method, path) {
  const verb = String(method || "").toUpperCase();
  const route = String(path || "").split("?")[0];
  if (verb === "GET") {
    return /^(?:\/payroll-runs|\/challans)(?:\/|$)/.test(route)
      ? "hr.payroll.prepare"
      : "hr.employee.read";
  }
  if (verb === "PATCH" && /^\/payroll-runs\/[^/]+\/status$/.test(route)) {
    return "hr.payroll.approve";
  }
  if (/^(?:\/payroll-runs|\/challans)(?:\/|$)/.test(route)) {
    return "hr.payroll.prepare";
  }
  return "hr.employee.manage";
}
