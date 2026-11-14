import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNonNegative, roundMoney, calculateSalary, calculateLoan, calculateGST,
  calculateTDS, calculateDepreciation, calculateWorkingCapital, calculateAttendancePayroll
} from "../../src/roleCalculatorMath.js";

test("amount validation rejects blanks, negative values, non-finite values and excessive precision", () => {
  for (const value of ["", -1, "not-a-number", Infinity, 1_000_000_000_001,
    null, undefined, true, false, [], [2], {}]) {
    assert.throws(() => parseNonNegative(value, "Test amount"));
  }
  assert.equal(parseNonNegative("0.10"), 0.1);
  assert.equal(roundMoney(10.005), 10.01);
});

test("salary calculation rounds each component to paise and rejects deductions above gross", () => {
  const result = calculateSalary({
    basic: "30000.00", hra: "12000", allowance: "5000",
    employeePfRate: "12", employerPfRate: "12", professionalTax: "200",
    esiEnabled: true, esiEmployeeRate: "0.75", esiEmployerRate: "3.25"
  });
  assert.equal(result.gross, 47000);
  assert.equal(result.employeePF, 3600);
  assert.equal(result.employeeESI, 352.5);
  assert.equal(result.net, 42847.5);
  assert.equal(result.annualGross, 564000);
  assert.throws(() => calculateSalary({
    basic: 100, hra: 0, allowance: 0, employeePfRate: 100,
    employerPfRate: 0, professionalTax: 1, esiEnabled: false,
    esiEmployeeRate: 0, esiEmployerRate: 0
  }), /deductions cannot exceed gross/);
  assert.throws(() => calculateSalary({
    basic: 100, hra: 0, allowance: 0, employeePfRate: 101,
    employerPfRate: 0, professionalTax: 0, esiEnabled: false,
    esiEmployeeRate: 0, esiEmployerRate: 0
  }), /between 0 and 100/);
});

test("loan schedule uses paise, reconciles total paid and closes the balance", () => {
  const result = calculateLoan({ principal: "100000", annualRate: "9", months: "12" });
  assert.equal(result.schedule.length, 12);
  assert.equal(result.finalBalance, 0);
  assert.equal(roundMoney(result.total - result.principal), result.totalInterest);
  assert.equal(roundMoney(result.schedule.reduce((sum, row) => sum + row.principal, 0)), result.principal);
  assert.equal(roundMoney(result.schedule.reduce((sum, row) => sum + row.interest, 0)), result.totalInterest);
});

test("zero-interest loan is evenly amortized with a final paise adjustment", () => {
  const result = calculateLoan({ principal: "100", annualRate: "0", months: "3" });
  assert.deepEqual(result.schedule.map(row => row.emi), [33.33, 33.33, 33.34]);
  assert.equal(result.finalBalance, 0);
  assert.equal(result.total, 100);
  assert.equal(result.totalInterest, 0);
});

test("small paise-rounded loans stop their schedule after the balance is cleared", () => {
  const result = calculateLoan({ principal: "0.01", annualRate: "100", months: "1200" });
  assert.equal(result.finalBalance, 0);
  assert.equal(result.total, 0.01);
  assert.equal(result.schedule.length, 1);
  assert.equal(result.schedule[0].emi, 0.01);
  assert.equal(result.schedule[0].balance, 0);
});

test("maximum supported loan amount keeps long-tenure totals finite", () => {
  const result = calculateLoan({
    principal: "1000000000000", annualRate: "100", months: "1200"
  });
  assert.equal(result.principal, 1_000_000_000_000);
  assert.equal(result.finalBalance, 0);
  assert.ok(Number.isFinite(result.emi));
  assert.ok(Number.isFinite(result.total));
  assert.ok(Number.isFinite(result.totalInterest));
});

test("loan input rejects fractional or unreasonable tenures and invalid rates", () => {
  assert.throws(() => calculateLoan({ principal: 1000, annualRate: 8, months: 0 }));
  assert.throws(() => calculateLoan({ principal: 1000, annualRate: 8, months: 1.5 }));
  assert.throws(() => calculateLoan({ principal: 1000, annualRate: 8, months: null }));
  assert.throws(() => calculateLoan({ principal: 1000, annualRate: 8, months: true }));
  assert.throws(() => calculateLoan({ principal: 1000, annualRate: 101, months: 12 }));
});

test("GST inclusive and exclusive calculations reconcile to invoice totals", () => {
  assert.deepEqual(calculateGST({ amount: 100, rate: 18, mode: "exclusive" }), {
    base: 100, gst: 18, total: 118, cgst: 9, sgst: 9
  });
  const inclusive = calculateGST({ amount: 118, rate: 18, mode: "inclusive" });
  assert.equal(inclusive.base, 100);
  assert.equal(inclusive.gst, 18);
  assert.equal(inclusive.total, 118);
  assert.throws(() => calculateGST({ amount: 100, rate: 18, mode: "unknown" }), /mode must be inclusive or exclusive/);
});

test("TDS never returns a negative net payable", () => {
  assert.deepEqual(calculateTDS({ amount: "1000.55", rate: "10" }), {
    tds: 100.06, netPayable: 900.49
  });
  assert.throws(() => calculateTDS({ amount: 100, rate: 101 }));
});

test("depreciation enforces salvage and useful-life boundaries", () => {
  assert.deepEqual(calculateDepreciation({
    cost: 500000, salvage: 50000, usefulLife: 5, method: "slm"
  }), { depreciation: 90000, bookValue: 410000 });
  assert.deepEqual(calculateDepreciation({
    cost: 500000, salvage: 50000, usefulLife: 5, method: "wdv", rate: 15
  }), { depreciation: 75000, bookValue: 425000 });
  assert.throws(() => calculateDepreciation({
    cost: 100, salvage: 101, usefulLife: 5, method: "slm"
  }));
  assert.throws(() => calculateDepreciation({
    cost: 100, salvage: 0, usefulLife: 0, method: "slm"
  }));
});

test("working capital handles negative cash and zero liabilities explicitly", () => {
  const result = calculateWorkingCapital({
    openingCash: 100, receipts: 20, payments: 150, receivables: 50,
    inventory: 25, payables: 0, shortTermDebt: 0
  });
  assert.equal(result.cash, -30);
  assert.equal(result.cashAsset, 0);
  assert.equal(result.bankOverdraft, 30);
  assert.equal(result.currentAssets, 75);
  assert.equal(result.currentLiabilities, 30);
  assert.equal(result.workingCapital, 45);
  assert.equal(result.currentRatio, 2.5);
});


test("attendance payroll prorates fixed earnings and validates complete day allocation", () => {
  const result = calculateAttendancePayroll({
    totalDays: 30, presentDays: 24, paidLeaveDays: 2, weeklyOffDays: 4,
    paidHolidayDays: 0, unpaidLeaveDays: 0,
    basic: 30000, hra: 12000, allowance: 3000,
    variableEarnings: 1500, otherDeductions: 500
  });
  assert.equal(result.paidDays, 30);
  assert.equal(result.payableRatio, 1);
  assert.equal(result.fixedGross, 45000);
  assert.equal(result.gross, 46500);
  assert.equal(result.net, 46000);

  assert.throws(() => calculateAttendancePayroll({
    totalDays: 30, presentDays: 24, paidLeaveDays: 2, weeklyOffDays: 3,
    paidHolidayDays: 0, unpaidLeaveDays: 0,
    basic: 30000, hra: 12000, allowance: 3000,
    variableEarnings: 0, otherDeductions: 0
  }), /must equal total payroll days/);
  assert.throws(() => calculateAttendancePayroll({
    totalDays: 30, presentDays: 24, paidLeaveDays: 2, weeklyOffDays: 4,
    paidHolidayDays: 0, unpaidLeaveDays: 0,
    basic: 30000, hra: 12000, allowance: 3000,
    variableEarnings: 0, otherDeductions: 50000
  }), /cannot exceed payable gross salary/);
  assert.throws(() => calculateAttendancePayroll({
    totalDays: 30, presentDays: 24.5, paidLeaveDays: 2, weeklyOffDays: 3.5,
    paidHolidayDays: 0, unpaidLeaveDays: 0,
    basic: 30000, hra: 12000, allowance: 3000,
    variableEarnings: 0, otherDeductions: 0
  }), /whole number/);
});

 
test("attendance payroll prorates fixed salary for unpaid leave while retaining approved variable items", () => {
  const result = calculateAttendancePayroll({
    totalDays: 30, presentDays: 20, paidLeaveDays: 2, weeklyOffDays: 4,
    paidHolidayDays: 1, unpaidLeaveDays: 3,
    basic: 30000, hra: 12000, allowance: 3000,
    variableEarnings: 1000, otherDeductions: 500
  });
  assert.equal(result.paidDays, 27);
  assert.equal(result.unpaidLeaveDays, 3);
  assert.equal(result.payableRatio, 0.9);
  assert.equal(result.basic, 27000);
  assert.equal(result.hra, 10800);
  assert.equal(result.allowance, 2700);
  assert.equal(result.fixedGross, 40500);
  assert.equal(result.variableEarnings, 1000);
  assert.equal(result.gross, 41500);
  assert.equal(result.net, 41000);
 
  assert.throws(() => calculateAttendancePayroll({
    totalDays: 30.5, presentDays: 20, paidLeaveDays: 2, weeklyOffDays: 4,
    paidHolidayDays: 1, unpaidLeaveDays: 3.5,
    basic: 30000, hra: 12000, allowance: 3000,
    variableEarnings: 0, otherDeductions: 0
  }), /whole number/);
});

 
test("attendance payroll with all unpaid days pays no fixed salary but preserves approved variable earnings", () => {
  const result = calculateAttendancePayroll({
    totalDays: 30, presentDays: 0, paidLeaveDays: 0, weeklyOffDays: 0,
    paidHolidayDays: 0, unpaidLeaveDays: 30,
    basic: 30000, hra: 12000, allowance: 3000,
    variableEarnings: 750, otherDeductions: 0
  });
  assert.equal(result.paidDays, 0);
  assert.equal(result.payableRatio, 0);
  assert.equal(result.fixedGross, 0);
  assert.equal(result.gross, 750);
  assert.equal(result.net, 750);
});

test("long zero-interest loan reconciles full-term totals while exposing only the first 12 rows", () => {
  const result = calculateLoan({ principal: "1200", annualRate: "0", months: "1200" });
  assert.equal(result.emi, 1);
  assert.equal(result.total, 1200);
  assert.equal(result.totalInterest, 0);
  assert.equal(result.finalBalance, 0);
  assert.equal(result.schedule.length, 12);
  assert.equal(result.schedule[0].balance, 1199);
  assert.equal(result.schedule[11].balance, 1188);
});

test("maximum-rate long-tenure loan keeps schedule and totals internally consistent", () => {
  const result = calculateLoan({ principal: "250000", annualRate: "100", months: "1200" });
  assert.equal(result.finalBalance, 0);
  assert.equal(result.schedule.length, 12);
  assert.ok(result.totalInterest > result.principal);
  assert.equal(roundMoney(result.total - result.principal), result.totalInterest);
  assert.equal(roundMoney(result.schedule.reduce((sum, row) => sum + row.principal, 0) +
    result.schedule.reduce((sum, row) => sum + row.interest, 0)),
    roundMoney(result.schedule.reduce((sum, row) => sum + row.emi, 0)));
});

test("GST splits odd paise without losing or creating tax", () => {
  for (const amount of ["0.01", "0.05", "1.01", "118.01", "999.99"]) {
    const result = calculateGST({ amount, rate: "18", mode: "exclusive" });
    assert.equal(roundMoney(result.cgst + result.sgst), result.gst);
    assert.equal(roundMoney(result.base + result.gst), result.total);
  }
  const zeroRate = calculateGST({ amount: "123.45", rate: "0", mode: "inclusive" });
  assert.equal(zeroRate.base, 123.45);
  assert.equal(zeroRate.gst, 0);
  assert.equal(zeroRate.total, 123.45);
});

test("TDS boundary rates preserve exact zero and full deduction cases", () => {
  assert.deepEqual(calculateTDS({ amount: "0", rate: "10" }), {
    tds: 0, netPayable: 0
  });
  assert.deepEqual(calculateTDS({ amount: "123.45", rate: "100" }), {
    tds: 123.45, netPayable: 0
  });
});

test("depreciation never reduces book value below salvage value", () => {
  const slm = calculateDepreciation({
    cost: "1000", salvage: "125", usefulLife: "3", method: "slm"
  });
  assert.equal(slm.depreciation, 291.67);
  assert.equal(slm.bookValue, 708.33);
  const wdv = calculateDepreciation({
    cost: "1000", salvage: "900", usefulLife: "5", method: "wdv", rate: "100"
  });
  assert.equal(wdv.depreciation, 100);
  assert.equal(wdv.bookValue, 900);
});

test("working capital explicitly handles zero liabilities and cash overdraft", () => {
  const noLiabilities = calculateWorkingCapital({
    openingCash: "100.01", receipts: "0", payments: "0",
    receivables: "0", inventory: "0", payables: "0", shortTermDebt: "0"
  });
  assert.equal(noLiabilities.currentRatio, null);
  assert.equal(noLiabilities.workingCapital, 100.01);

  const overdraft = calculateWorkingCapital({
    openingCash: "0", receipts: "0", payments: "0.01",
    receivables: "0", inventory: "0", payables: "0", shortTermDebt: "0"
  });
  assert.equal(overdraft.cash, -0.01);
  assert.equal(overdraft.bankOverdraft, 0.01);
  assert.equal(overdraft.currentAssets, 0);
  assert.equal(overdraft.currentLiabilities, 0.01);
  assert.equal(overdraft.workingCapital, -0.01);
});
