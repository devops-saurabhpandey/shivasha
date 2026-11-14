/**
 * Enforce a maker-checker payroll workflow.
 * User and actor IDs must come from authenticated server-side records.
 */
export function validatePayrollTransition({ currentStatus, nextStatus, createdBy, approvedBy, userId }) {
  const transitions = {
    Draft: ["Draft", "Approved"],
    Approved: ["Approved", "Paid"],
    Paid: ["Paid"]
  };
  if (!["Draft", "Approved", "Paid"].includes(nextStatus) ||
      !transitions[currentStatus]?.includes(nextStatus)) {
    return {
      allowed: false,
      statusCode: 409,
      message: "Invalid payroll status transition. Use Draft → Approved → Paid; approved or paid payroll cannot be reopened here."
    };
  }
  if (currentStatus === nextStatus) return { allowed: true, noChange: true };
  if (nextStatus === "Approved" && String(createdBy) === String(userId)) {
    return {
      allowed: false,
      statusCode: 403,
      message: "Maker-checker control: the payroll preparer cannot approve their own payroll run"
    };
  }
  if (nextStatus === "Paid" && !approvedBy) {
    return {
      allowed: false,
      statusCode: 409,
      message: "Payroll must have a recorded approver before it can be marked paid"
    };
  }
  if (nextStatus === "Paid" && String(approvedBy) === String(userId)) {
    return {
      allowed: false,
      statusCode: 403,
      message: "Payment release must be performed by a different user from the payroll approver"
    };
  }
  return { allowed: true, noChange: false };
}
