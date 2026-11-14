/**
 * Shared, deterministic INR calculator primitives.
 *
 * Amounts are rounded to paise at each posted calculation boundary. Rates are
 * supplied as percentage values (e.g. 12 for 12%). These are planning
 * calculations, not a statutory rule engine.
 */
const MAX_AMOUNT_RUPEES = 1_000_000_000_000;
const MAX_RATE_PERCENT = 100;
const MAX_LOAN_MONTHS = 1200;

export function parseNonNegative(value, label = "Amount", { max = MAX_AMOUNT_RUPEES } = {}) {
  if (value === null || value === undefined ||
      (typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "string" && value.trim() === "")) {
    throw new TypeError(label + " must be a number");
  }
  const number = typeof value === "number" ? value : Number(value.trim());
  if (!Number.isFinite(number) || number < 0 || number > max) {
    throw new RangeError(label + " must be between 0 and " + max);
  }
  return number;
}

export function roundMoney(value) {
  if (!Number.isFinite(value)) throw new TypeError("Money value must be finite");
  const cents = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) throw new RangeError("Money value exceeds safe precision");
  return cents / 100;
}

function cents(value, label) {
  return Math.round(parseNonNegative(value, label) * 100);
}

function rate(value, label = "Rate") {
  return parseNonNegative(value, label, { max: MAX_RATE_PERCENT }) / 100;
}

export function calculateSalary(input) {
  const basic = roundMoney(parseNonNegative(input.basic, "Basic salary"));
  const hra = roundMoney(parseNonNegative(input.hra, "HRA"));
  const allowance = roundMoney(parseNonNegative(input.allowance, "Other allowances"));
  const gross = roundMoney(basic + hra + allowance);
  const employeePF = roundMoney(basic * rate(input.employeePfRate, "Employee PF rate"));
  const employerPF = roundMoney(basic * rate(input.employerPfRate, "Employer PF rate"));
  const esiBase = input.esiEnabled ? gross : 0;
  const employeeESI = roundMoney(esiBase * rate(input.esiEmployeeRate, "Employee ESI rate"));
  const employerESI = roundMoney(esiBase * rate(input.esiEmployerRate, "Employer ESI rate"));
  const professionalTax = roundMoney(parseNonNegative(input.professionalTax, "Professional tax"));
  const deductions = roundMoney(employeePF + employeeESI + professionalTax);
  if (deductions > gross) throw new RangeError("Monthly deductions cannot exceed gross salary");
  return {
    gross, employeePF, employerPF, employeeESI, employerESI, professionalTax,
    deductions, net: roundMoney(gross - deductions),
    annualGross: roundMoney(gross * 12),
    annualNet: roundMoney((gross - deductions) * 12),
    ctc: roundMoney((gross + employerPF + employerESI) * 12)
  };
}

export function calculateLoan(input) {
  const principalCents = cents(input.principal, "Loan principal");
  const annualRate = rate(input.annualRate, "Annual interest rate");
  if (input.months === null || input.months === undefined ||
      (typeof input.months !== "number" && typeof input.months !== "string") ||
      (typeof input.months === "string" && input.months.trim() === "")) {
    throw new TypeError("Loan tenure must be a whole number");
  }
  const months = Number(input.months);
  if (!Number.isInteger(months) || months < 1 || months > MAX_LOAN_MONTHS) {
    throw new RangeError("Loan tenure must be a whole number between 1 and " + MAX_LOAN_MONTHS + " months");
  }
  if (principalCents < 1) throw new RangeError("Loan principal must be at least ₹0.01");
  const monthlyRate = annualRate / 12;
  const rawEmi = monthlyRate === 0
    ? principalCents / months
    : principalCents * monthlyRate * Math.pow(1 + monthlyRate, months) /
      (Math.pow(1 + monthlyRate, months) - 1);
  if (!Number.isFinite(rawEmi) || rawEmi <= 0) throw new RangeError("Unable to calculate a valid EMI");
  const emiCents = Math.max(1, Math.round(rawEmi));
  let balance = principalCents;
  let totalInterestCents = 0;
  let totalPaidCents = 0;
  const schedule = [];
  for (let month = 1; month <= months; month += 1) {
    const interestCents = Math.round(balance * monthlyRate);
    // The final instalment clears the exact remaining principal plus accrued interest.
    // This absorbs paise rounding differences and guarantees a zero closing balance.
    const paymentCents = month === months
      ? balance + interestCents
      : Math.min(balance + interestCents, Math.max(emiCents, interestCents + 1));
    const principalPartCents = paymentCents - interestCents;
    balance = Math.max(0, balance - principalPartCents);
    totalInterestCents += interestCents;
    totalPaidCents += paymentCents;
    if (month <= 12) {
      schedule.push({
        month,
        emi: paymentCents / 100,
        principal: principalPartCents / 100,
        interest: interestCents / 100,
        balance: balance / 100
      });
    }
  }
  return {
    emi: emiCents / 100,
    total: totalPaidCents / 100,
    totalInterest: totalInterestCents / 100,
    principal: principalCents / 100,
    schedule,
    finalBalance: balance / 100
  };
}

export function calculateGST(input) {
  if (input.mode !== "inclusive" && input.mode !== "exclusive") {
    throw new RangeError("GST mode must be inclusive or exclusive");
  }
  const entered = roundMoney(parseNonNegative(input.amount, "GST amount"));
  const gstRate = rate(input.rate, "GST rate");
  const base = input.mode === "inclusive" ? roundMoney(entered / (1 + gstRate)) : entered;
  const gst = input.mode === "inclusive" ? roundMoney(entered - base) : roundMoney(base * gstRate);
  return {
    base, gst, total: input.mode === "inclusive" ? entered : roundMoney(base + gst),
    cgst: roundMoney(gst / 2), sgst: roundMoney(gst - roundMoney(gst / 2))
  };
}

export function calculateTDS(input) {
  const amount = roundMoney(parseNonNegative(input.amount, "TDS payment amount"));
  const tds = roundMoney(amount * rate(input.rate, "TDS rate"));
  return { tds, netPayable: roundMoney(amount - tds) };
}

export function calculateDepreciation(input) {
  const cost = roundMoney(parseNonNegative(input.cost, "Asset cost"));
  const salvage = roundMoney(parseNonNegative(input.salvage, "Salvage value"));
  const life = parseNonNegative(input.usefulLife, "Useful life", { max: 100 });
  if (salvage > cost) throw new RangeError("Salvage value cannot exceed asset cost");
  if (life <= 0) throw new RangeError("Useful life must be greater than zero");
  let depreciation;
  if (input.method === "wdv") {
    depreciation = roundMoney(cost * rate(input.rate, "WDV rate"));
  } else if (input.method === "slm") {
    depreciation = roundMoney((cost - salvage) / life);
  } else {
    throw new RangeError("Unsupported depreciation method");
  }
  depreciation = Math.min(depreciation, roundMoney(cost - salvage));
  return { depreciation, bookValue: roundMoney(cost - depreciation) };
}

export function calculateWorkingCapital(input) {
  const openingCash = roundMoney(parseNonNegative(input.openingCash, "Opening cash"));
  const receipts = roundMoney(parseNonNegative(input.receipts, "Cash receipts"));
  const payments = roundMoney(parseNonNegative(input.payments, "Cash payments"));
  const receivables = roundMoney(parseNonNegative(input.receivables, "Trade receivables"));
  const inventory = roundMoney(parseNonNegative(input.inventory, "Inventory"));
  const payables = roundMoney(parseNonNegative(input.payables, "Trade payables"));
  const debt = roundMoney(parseNonNegative(input.shortTermDebt, "Short-term debt"));
  const cash = roundMoney(openingCash + receipts - payments);
  // A negative bank balance is an overdraft liability, not a negative current asset.
  const cashAsset = Math.max(0, cash);
  const bankOverdraft = roundMoney(Math.max(0, -cash));
  const currentAssets = roundMoney(cashAsset + receivables + inventory);
  const currentLiabilities = roundMoney(payables + debt + bankOverdraft);
  return {
    cash, cashAsset, bankOverdraft, netCashFlow: roundMoney(receipts - payments),
    currentAssets, currentLiabilities,
    workingCapital: roundMoney(currentAssets - currentLiabilities),
    currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : null
  };
}

function wholeDays(value, label, max = 31) {
  const number = parseNonNegative(value, label, { max });
  if (!Number.isInteger(number)) throw new RangeError(label + " must be a whole number");
  return number;
}

/**
 * Attendance-based fixed-salary proration. Day categories must account for
 * every payroll day exactly once. Variable earnings and other deductions are
 * supplied as already-approved monthly amounts; no statutory deductions are
 * inferred or calculated here.
 */
export function calculateAttendancePayroll(input) {
  const totalDays = wholeDays(input.totalDays, "Total payroll days", 31);
  if (totalDays < 1) throw new RangeError("Total payroll days must be between 1 and 31");
  const presentDays = wholeDays(input.presentDays, "Present days", totalDays);
  const paidLeaveDays = wholeDays(input.paidLeaveDays, "Paid leave days", totalDays);
  const weeklyOffDays = wholeDays(input.weeklyOffDays, "Weekly off days", totalDays);
  const paidHolidayDays = wholeDays(input.paidHolidayDays, "Paid holiday days", totalDays);
  const unpaidLeaveDays = wholeDays(input.unpaidLeaveDays, "Unpaid leave days", totalDays);
  const accountedDays = presentDays + paidLeaveDays + weeklyOffDays + paidHolidayDays + unpaidLeaveDays;
  if (accountedDays !== totalDays) {
    throw new RangeError("Present, paid leave, weekly off, paid holiday and unpaid leave days must equal total payroll days");
  }
  const paidDays = presentDays + paidLeaveDays + weeklyOffDays + paidHolidayDays;
  const factor = paidDays / totalDays;
  const basic = roundMoney(parseNonNegative(input.basic, "Basic salary") * factor);
  const hra = roundMoney(parseNonNegative(input.hra, "HRA") * factor);
  const allowance = roundMoney(parseNonNegative(input.allowance, "Other allowances") * factor);
  const variableEarnings = roundMoney(parseNonNegative(input.variableEarnings, "Variable earnings"));
  const otherDeductions = roundMoney(parseNonNegative(input.otherDeductions, "Other deductions"));
  const fixedGross = roundMoney(basic + hra + allowance);
  const gross = roundMoney(fixedGross + variableEarnings);
  if (otherDeductions > gross) throw new RangeError("Other deductions cannot exceed payable gross salary");
  return {
    totalDays, paidDays, unpaidLeaveDays, payableRatio: factor,
    basic, hra, allowance, fixedGross, variableEarnings, gross,
    otherDeductions, net: roundMoney(gross - otherDeductions)
  };
}
