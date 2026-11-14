import test from "node:test";
import assert from "node:assert/strict";
import { calculateAttendancePayroll } from "../../src/roleCalculatorMath.js";

const base = {
  basic: 30000, hra: 12000, allowance: 5000,
  variableEarnings: 1500, otherDeductions: 500,
  presentDays: 20, paidLeaveDays: 1, weeklyOffDays: 4,
  paidHolidayDays: 1, unpaidLeaveDays: 0, totalDays: 26
};

test("attendance payroll treats paid leave, weekly offs and holidays as paid days", () => {
  const result = calculateAttendancePayroll(base);
  assert.equal(result.paidDays, 26);
  assert.equal(result.payableRatio, 1);
  assert.equal(result.fixedGross, 47000);
  assert.equal(result.gross, 48500);
  assert.equal(result.net, 48000);
});

test("attendance payroll prorates fixed components for unpaid leave", () => {
  const result = calculateAttendancePayroll({ ...base, unpaidLeaveDays: 2, presentDays: 18 });
  assert.equal(result.paidDays, 24);
  assert.equal(result.basic, 27692.31);
  assert.equal(result.hra, 11076.92);
  assert.equal(result.allowance, 4615.38);
  assert.equal(result.fixedGross, 43384.61);
});

test("attendance payroll rejects missing or duplicated day classifications", () => {
  assert.throws(() => calculateAttendancePayroll({ ...base, presentDays: 19 }), /must equal total payroll days/);
  assert.throws(() => calculateAttendancePayroll({ ...base, unpaidLeaveDays: 1 }), /must equal total payroll days/);
});

test("attendance payroll rejects fractional days and zero payroll denominator", () => {
  assert.throws(() => calculateAttendancePayroll({ ...base, presentDays: 20.5 }), /whole number/);
  assert.throws(() => calculateAttendancePayroll({ ...base, totalDays: 0 }), /between 1 and 31/);
});

test("attendance payroll rejects deductions above payable gross", () => {
  assert.throws(() => calculateAttendancePayroll({ ...base, otherDeductions: 50000 }), /cannot exceed payable gross/);
});
