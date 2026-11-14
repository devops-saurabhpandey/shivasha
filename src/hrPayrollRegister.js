import { calculateAttendancePayroll } from "./roleCalculatorMath.js";

function validMonth(value) {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new TypeError("Payroll month must use YYYY-MM format");
  }
  return value;
}

function requiredText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(field + " is required");
  const result = value.trim();
  if (result.length > maxLength) throw new RangeError(field + " is too long");
  return result;
}

/**
 * Builds a reproducible monthly payroll register from an explicit employee
 * and attendance snapshot. Statutory contributions are intentionally absent:
 * they require separately approved, effective-dated eligibility and rate rules.
 */
export function buildMonthlyPayrollRegister({ month, employees }) {
  const payrollMonth = validMonth(month);
  if (!Array.isArray(employees) || employees.length === 0) {
    throw new TypeError("At least one employee snapshot is required");
  }
  const seenCodes = new Set();
  const records = [];
  const excludedEmployees = [];

  for (const employee of employees) {
    if (!employee || typeof employee !== "object" || Array.isArray(employee)) {
      throw new TypeError("Each employee must be an object");
    }
    const employeeCode = requiredText(employee.employeeCode, "Employee code", 30);
    const name = requiredText(employee.name, "Employee name", 100);
    const codeKey = employeeCode.toUpperCase();
    if (seenCodes.has(codeKey)) throw new RangeError("Duplicate employee code: " + employeeCode);
    seenCodes.add(codeKey);

    if (employee.status === "Inactive") {
      excludedEmployees.push({ employeeCode, reason: "Inactive employee" });
      continue;
    }
    if (!["Active", "On leave"].includes(employee.status)) {
      throw new RangeError("Employee status must be Active, On leave or Inactive");
    }
    if (employee.uan && !/^\d{12}$/.test(employee.uan)) {
      throw new RangeError("UAN must contain exactly 12 digits");
    }
    if (!employee.attendance || typeof employee.attendance !== "object") {
      throw new TypeError("Attendance snapshot is required for " + employeeCode);
    }
    const payroll = calculateAttendancePayroll({
      basic: employee.basicSalary,
      hra: employee.hra,
      allowance: Number(employee.da || 0) + Number(employee.otherAllowances || 0),
      variableEarnings: employee.attendance.variableEarnings ?? 0,
      otherDeductions: employee.attendance.otherDeductions ?? 0,
      presentDays: employee.attendance.presentDays,
      paidLeaveDays: employee.attendance.paidLeaveDays,
      weeklyOffDays: employee.attendance.weeklyOffDays,
      paidHolidayDays: employee.attendance.paidHolidayDays,
      unpaidLeaveDays: employee.attendance.unpaidLeaveDays,
      totalDays: employee.attendance.totalDays
    });
    records.push({
      employeeCode,
      name,
      uan: employee.uan || "",
      attendance: {
        totalDays: payroll.totalDays,
        presentDays: employee.attendance.presentDays,
        paidLeaveDays: employee.attendance.paidLeaveDays,
        weeklyOffDays: employee.attendance.weeklyOffDays,
        paidHolidayDays: employee.attendance.paidHolidayDays,
        unpaidLeaveDays: payroll.unpaidLeaveDays,
        paidDays: payroll.paidDays
      },
      salary: {
        basic: payroll.basic,
        hra: payroll.hra,
        allowances: payroll.allowance,
        gross: payroll.gross,
        otherEarnings: payroll.variableEarnings,
        otherDeductions: payroll.otherDeductions,
        netPay: payroll.net
      }
    });
  }

  const totals = records.reduce((sum, record) => ({
    gross: sum.gross + record.salary.gross,
    otherEarnings: sum.otherEarnings + record.salary.otherEarnings,
    otherDeductions: sum.otherDeductions + record.salary.otherDeductions,
    netPay: sum.netPay + record.salary.netPay
  }), { gross: 0, otherEarnings: 0, otherDeductions: 0, netPay: 0 });
  for (const key of Object.keys(totals)) totals[key] = Math.round((totals[key] + Number.EPSILON) * 100) / 100;

  return {
    month: payrollMonth,
    employeeCount: records.length,
    excludedEmployees,
    totals,
    records
  };
}
