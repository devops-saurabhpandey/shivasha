import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyPayrollRegister } from "../../src/hrPayrollRegister.js";

const employee = (overrides = {}) => ({
  employeeCode: "EMP-001",
  name: "Asha Sharma",
  status: "Active",
  uan: "123456789012",
  basicSalary: 30000,
  hra: 12000,
  da: 2000,
  otherAllowances: 3000,
  attendance: {
    presentDays: 20, paidLeaveDays: 1, weeklyOffDays: 4,
    paidHolidayDays: 1, unpaidLeaveDays: 0, totalDays: 26,
    variableEarnings: 1500, otherDeductions: 500
  },
  ...overrides
});

test("monthly payroll register snapshots employee salary and attendance with reconciled totals", () => {
  const result = buildMonthlyPayrollRegister({ month: "2026-11", employees: [employee()] });
  assert.equal(result.month, "2026-11");
  assert.equal(result.employeeCount, 1);
  assert.equal(result.records[0].attendance.paidDays, 26);
  assert.equal(result.records[0].salary.gross, 48500);
  assert.equal(result.records[0].salary.netPay, 48000);
  assert.deepEqual(result.totals, {
    gross: 48500, otherEarnings: 1500, otherDeductions: 500, netPay: 48000
  });
});

test("inactive employees are excluded and reported", () => {
  const result = buildMonthlyPayrollRegister({
    month: "2026-11",
    employees: [employee({ status: "Inactive", attendance: undefined })]
  });
  assert.equal(result.employeeCount, 0);
  assert.deepEqual(result.excludedEmployees, [
    { employeeCode: "EMP-001", reason: "Inactive employee" }
  ]);
});

test("register rejects duplicate employee codes case-insensitively", () => {
  assert.throws(() => buildMonthlyPayrollRegister({
    month: "2026-11",
    employees: [employee(), employee({ employeeCode: "emp-001", name: "Other" })]
  }), /Duplicate employee code/);
});

test("register rejects invalid month, employee identity, UAN and missing attendance", () => {
  assert.throws(() => buildMonthlyPayrollRegister({ month: "2026-13", employees: [employee()] }), /YYYY-MM/);
  assert.throws(() => buildMonthlyPayrollRegister({ month: "2026-11", employees: [employee({ name: "" })] }), /Employee name is required/);
  assert.throws(() => buildMonthlyPayrollRegister({ month: "2026-11", employees: [employee({ uan: "123" })] }), /UAN/);
  assert.throws(() => buildMonthlyPayrollRegister({
    month: "2026-11", employees: [employee({ attendance: undefined })]
  }), /Attendance snapshot is required/);
});

test("register rejects attendance that does not reconcile and unknown employee status", () => {
  assert.throws(() => buildMonthlyPayrollRegister({
    month: "2026-11",
    employees: [employee({ attendance: { ...employee().attendance, presentDays: 19 } })]
  }), /must equal total payroll days/);
  assert.throws(() => buildMonthlyPayrollRegister({
    month: "2026-11", employees: [employee({ status: "Suspended" })]
  }), /Employee status/);
});
