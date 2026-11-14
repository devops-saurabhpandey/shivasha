import React, { useMemo, useState } from "react";
import {
  calculateSalary, calculateLoan, calculateGST, calculateTDS,
  calculateDepreciation, calculateWorkingCapital, calculateAttendancePayroll
} from "./roleCalculatorMath.js";

const safeCalculate = callback => {
  try { return { value: callback(), error: "" }; }
  catch (error) { return { value: null, error: error.message || "Invalid calculator input" }; }
};
const n = value => Math.max(0, Number(value) || 0);
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
const Field = ({ label, value, onChange, suffix = "", step = "1", min = "0" }) => <label className="role-field">{label}<div className="role-input-wrap"><input type="number" min={min} step={step} value={value} onChange={e => onChange(e.target.value)} /><span>{suffix}</span></div></label>;
const Stat = ({ label, value, note }) => <div className="role-stat"><small>{label}</small><strong>{value}</strong>{note && <span>{note}</span>}</div>;

export default function RoleCalculators() {
  const [tab, setTab] = useState("hr");
  const [basic, setBasic] = useState("30000"), [hra, setHra] = useState("12000"), [allowance, setAllowance] = useState("5000");
  const [employeePf, setEmployeePf] = useState("12"), [employerPf, setEmployerPf] = useState("12"), [professionalTax, setProfessionalTax] = useState("200");
  const [esiEnabled, setEsiEnabled] = useState(false), [esiEmployee, setEsiEmployee] = useState("0.75"), [esiEmployer, setEsiEmployer] = useState("3.25");
  const [presentDays, setPresentDays] = useState("20"), [paidLeaveDays, setPaidLeaveDays] = useState("1");
  const [weeklyOffDays, setWeeklyOffDays] = useState("4"), [paidHolidayDays, setPaidHolidayDays] = useState("1");
  const [unpaidLeaveDays, setUnpaidLeaveDays] = useState("0"), [totalPayrollDays, setTotalPayrollDays] = useState("26");
  const [variableEarnings, setVariableEarnings] = useState("0"), [otherDeductions, setOtherDeductions] = useState("0");
  const [principal, setPrincipal] = useState("1000000"), [interest, setInterest] = useState("9"), [months, setMonths] = useState("120");
  const [gstBase, setGstBase] = useState("100000"), [gstRate, setGstRate] = useState("18"), [gstMode, setGstMode] = useState("exclusive");
  const [tdsBase, setTdsBase] = useState("50000"), [tdsRate, setTdsRate] = useState("10");
  const [assetCost, setAssetCost] = useState("500000"), [salvage, setSalvage] = useState("50000"), [usefulLife, setUsefulLife] = useState("5"), [depreciationMethod, setDepreciationMethod] = useState("slm"), [depreciationRate, setDepreciationRate] = useState("15");
  const [revenue, setRevenue] = useState("500000"), [expenses, setExpenses] = useState("320000"), [otherIncome, setOtherIncome] = useState("10000");
  const [openingCash, setOpeningCash] = useState("250000"), [cashReceipts, setCashReceipts] = useState("600000"), [cashPayments, setCashPayments] = useState("420000");
  const [receivables, setReceivables] = useState("180000"), [inventory, setInventory] = useState("120000"), [payables, setPayables] = useState("90000"), [shortTermDebt, setShortTermDebt] = useState("60000");

  const hrResult = useMemo(() => safeCalculate(() => calculateSalary({
    basic, hra, allowance, employeePfRate: employeePf, employerPfRate: employerPf,
    professionalTax, esiEnabled, esiEmployeeRate: esiEmployee, esiEmployerRate: esiEmployer
  })), [basic,hra,allowance,employeePf,employerPf,professionalTax,esiEnabled,esiEmployee,esiEmployer]);
  const hr = hrResult.value || {gross:0,net:0,annualGross:0,annualNet:0,employeePF:0,employerPF:0,deductions:0,employeeESI:0,employerESI:0};
  const attendanceResult = useMemo(() => safeCalculate(() => calculateAttendancePayroll({
    basic, hra, allowance, variableEarnings, otherDeductions,
    presentDays, paidLeaveDays, weeklyOffDays, paidHolidayDays,
    unpaidLeaveDays, totalDays: totalPayrollDays
  })), [basic,hra,allowance,variableEarnings,otherDeductions,presentDays,paidLeaveDays,weeklyOffDays,paidHolidayDays,unpaidLeaveDays,totalPayrollDays]);
  const attendance = attendanceResult.value || {paidDays:0,totalDays:0,payableRatio:0,fixedGross:0,gross:0,net:0};

  const loanResult = useMemo(() => safeCalculate(() => calculateLoan({
    principal, annualRate: interest, months
  })), [principal,interest,months]);
  const loan = loanResult.value || {emi:0,total:0,totalInterest:0,principal:0,schedule:[],finalBalance:0};

  const gstResult = useMemo(() => safeCalculate(() => calculateGST({
    amount: gstBase, rate: gstRate, mode: gstMode
  })), [gstBase,gstRate,gstMode]);
  const tdsResult = useMemo(() => safeCalculate(() => calculateTDS({
    amount: tdsBase, rate: tdsRate
  })), [tdsBase,tdsRate]);
  const depreciationResult = useMemo(() => safeCalculate(() => calculateDepreciation({
    cost: assetCost, salvage, usefulLife, method: depreciationMethod, rate: depreciationRate
  })), [assetCost,salvage,usefulLife,depreciationMethod,depreciationRate]);
  const profitResult = useMemo(() => safeCalculate(() => {
    const income = Number(revenue), expense = Number(expenses), other = Number(otherIncome);
    if (![income,expense,other].every(value => Number.isFinite(value) && value >= 0 && value <= 1000000000000)) {
      throw new RangeError("Revenue, expenses and other income must be valid non-negative amounts");
    }
    const profit = Math.round((income + other - expense + Number.EPSILON) * 100) / 100;
    return {profit, margin: income > 0 ? profit / income * 100 : 0};
  }), [revenue,expenses,otherIncome]);
  const ca = {
    base: gstResult.value?.base || 0, gst: gstResult.value?.gst || 0,
    total: gstResult.value?.total || 0, cgst: gstResult.value?.cgst || 0,
    sgst: gstResult.value?.sgst || 0, tds: tdsResult.value?.tds || 0,
    netPayable: tdsResult.value?.netPayable || 0,
    dep: depreciationResult.value?.depreciation || 0,
    bookValue: depreciationResult.value?.bookValue || 0,
    profit: profitResult.value?.profit || 0, margin: profitResult.value?.margin || 0
  };

  const financeResult = useMemo(() => safeCalculate(() => calculateWorkingCapital({
    openingCash, receipts: cashReceipts, payments: cashPayments,
    receivables, inventory, payables, shortTermDebt
  })), [openingCash,cashReceipts,cashPayments,receivables,inventory,payables,shortTermDebt]);
  const finance = financeResult.value || {
    cash:0,netCashFlow:0,currentAssets:0,currentLiabilities:0,workingCapital:0,currentRatio:null
  };

  const tabs=[["hr","🧑‍💼","HR Manager"],["loan","💼","Finance Manager"],["ca","📊","Chartered Accountant"]];
  return <section className="content role-calculators">
    <style>{`
      .role-calculators{max-width:1120px}.role-hero{padding:24px;border-radius:18px;background:linear-gradient(125deg,#163b55,#246c70);color:#fff;margin-bottom:16px}.role-hero h2{color:#fff;margin:7px 0}.role-hero p{color:#e1f1f2;margin:0;line-height:1.6}.role-kicker{font-size:10px;letter-spacing:.15em;font-weight:900;color:#bfe6dc}.role-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.role-tabs button{border:1px solid #dbe4ed;border-radius:999px;padding:10px 15px;background:#fff;color:#334155;font-weight:800;cursor:pointer}.role-tabs button.active{background:#173b54;color:#fff;border-color:#173b54}.role-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.85fr);gap:14px}.role-panel{padding:20px}.role-panel h3{margin:0 0 8px}.role-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 14px}.role-field{display:block;margin:10px 0;font-size:12px;font-weight:750;color:#344054}.role-input-wrap{display:flex;align-items:center;margin-top:6px;border:1px solid #dbe2ea;border-radius:9px;background:#fff;overflow:hidden}.role-input-wrap input{width:100%;min-width:0;border:0!important;outline:0;padding:11px!important;font:inherit;color:#17243b}.role-input-wrap span{padding:0 10px;color:#748094;font-size:11px}.role-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.role-stat{padding:13px;border:1px solid #e4eaf0;border-radius:12px;background:#f8fafc;min-width:0}.role-stat small,.role-stat span{display:block;color:#66758b;font-size:11px}.role-stat strong{display:block;margin:5px 0;color:#183b55;font-size:19px;overflow-wrap:anywhere}.role-stat span{font-size:10px}.role-check{display:flex;gap:8px;align-items:center;margin:12px 0;font-size:12px}.role-table-wrap{overflow:auto;margin-top:14px}.role-table{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap}.role-table th,.role-table td{padding:9px;border-bottom:1px solid #e8edf2;text-align:right}.role-table th:first-child,.role-table td:first-child{text-align:left}.role-note{padding:12px;border-radius:10px;background:#fff8e8;color:#76571d;font-size:11px;line-height:1.6;margin-top:14px}.role-disclaimer{margin:16px 2px;color:#748094;font-size:11px;line-height:1.6}.role-select{width:100%;padding:11px;border:1px solid #dbe2ea;border-radius:9px;background:#fff;color:#17243b;margin-top:6px}@media(max-width:760px){.role-grid{grid-template-columns:1fr}.role-fields{grid-template-columns:1fr}.role-panel{padding:15px}.role-hero{padding:20px}.role-tabs button{flex:1 1 100%;text-align:left}}
    `}</style>
    <div className="role-hero"><span className="role-kicker">SHIVASHA • PROFESSIONAL TOOLS</span><h2>HR, Finance & CA Calculators</h2><p>Practical India-focused tools for payroll, cash flow, working capital, loan EMI, GST, TDS and accounts.</p></div>
    <div className="role-tabs" role="tablist" aria-label="Professional calculator categories">{tabs.map(([key,icon,label])=><button type="button" role="tab" aria-selected={tab===key} key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{icon} {label}</button>)}</div>
    {tab==="hr"&&<div className="role-grid">
      <div className="panel role-panel"><h3>HR Manager · Salary Calculator</h3><p className="muted">Enter monthly salary components and contribution rates.</p><div className="role-fields">
        <Field label="Basic salary" value={basic} onChange={setBasic} suffix="₹ / month"/><Field label="HRA" value={hra} onChange={setHra} suffix="₹ / month"/><Field label="Other allowances" value={allowance} onChange={setAllowance} suffix="₹ / month"/><Field label="Employee PF rate" value={employeePf} onChange={setEmployeePf} suffix="%"/><Field label="Employer PF rate" value={employerPf} onChange={setEmployerPf} suffix="%"/><Field label="Professional tax" value={professionalTax} onChange={setProfessionalTax} suffix="₹ / month"/>
      </div><label className="role-check"><input type="checkbox" checked={esiEnabled} onChange={e=>setEsiEnabled(e.target.checked)}/> Include ESI (enter applicable rates)</label>{esiEnabled&&<div className="role-fields"><Field label="Employee ESI rate" value={esiEmployee} onChange={setEsiEmployee} suffix="%"/><Field label="Employer ESI rate" value={esiEmployer} onChange={setEsiEmployer} suffix="%"/></div>}</div>
      <div className="panel role-panel"><h3>Salary Summary</h3>{hrResult.error&&<div className="role-note" role="alert">{hrResult.error}</div>}<div className="role-stats"><Stat label="Monthly gross salary" value={money(hr.gross)}/><Stat label="Monthly take-home" value={money(hr.net)}/><Stat label="Annual gross salary" value={money(hr.annualGross)}/><Stat label="Annual take-home" value={money(hr.annualNet)}/><Stat label="Employee PF deduction" value={money(hr.employeePF)}/><Stat label="Employer PF contribution" value={money(hr.employerPF)}/><Stat label="Total monthly deductions" value={money(hr.deductions)}/><Stat label="Estimated annual CTC" value={money(hr.ctc)}/></div><p className="muted">ESI employee deduction: {money(hr.employeeESI)} · Employer ESI: {money(hr.employerESI)}</p><div className="role-note">PF/ESI eligibility, wage ceiling, basic-wage definition, professional tax and exemptions vary by law and employee circumstances. Confirm current statutory rules before payroll processing.</div></div>
    </div>
      <div className="panel role-panel" style={{marginTop:14}}>
        <h3>Attendance-Based Payroll</h3>
        <p className="muted">Prorate fixed salary components using the company's approved payroll-day convention.</p>
        <div className="role-fields">
          <Field label="Present days" value={presentDays} onChange={setPresentDays} suffix="days"/>
          <Field label="Paid leave days" value={paidLeaveDays} onChange={setPaidLeaveDays} suffix="days"/>
          <Field label="Weekly off days" value={weeklyOffDays} onChange={setWeeklyOffDays} suffix="days"/>
          <Field label="Paid holiday days" value={paidHolidayDays} onChange={setPaidHolidayDays} suffix="days"/>
          <Field label="Unpaid leave days" value={unpaidLeaveDays} onChange={setUnpaidLeaveDays} suffix="days"/>
          <Field label="Total payroll days" value={totalPayrollDays} onChange={setTotalPayrollDays} suffix="days"/>
          <Field label="Variable earnings" value={variableEarnings} onChange={setVariableEarnings} suffix="₹"/>
          <Field label="Other approved deductions" value={otherDeductions} onChange={setOtherDeductions} suffix="₹"/>
        </div>
        {attendanceResult.error&&<div className="role-note" role="alert">{attendanceResult.error}</div>}
        <div className="role-stats">
          <Stat label="Paid days" value={attendance.paidDays+" / "+attendance.totalDays}/>
          <Stat label="Payable ratio" value={(attendance.payableRatio*100).toFixed(2)+"%"}/>
          <Stat label="Prorated fixed gross" value={money(attendance.fixedGross)}/>
          <Stat label="Payable gross" value={money(attendance.gross)}/>
          <Stat label="Net payable" value={money(attendance.net)}/>
        </div>
        <div className="role-note">Paid leave, weekly offs and paid holidays count as paid days. Every calendar/payroll day must be classified exactly once. Variable earnings and other deductions are entered as approved amounts. This tool does not determine statutory eligibility or deductions.</div>
      </div>}
    {tab==="loan"&&<><div className="role-grid">
      <div className="panel role-panel"><h3>Finance Manager · Cash Flow & Working Capital</h3><p className="muted">Monitor cash position, operating cash flow, receivables, inventory and short-term obligations.</p><div className="role-fields">
        <Field label="Opening cash balance" value={openingCash} onChange={setOpeningCash} suffix="₹"/>
        <Field label="Cash receipts" value={cashReceipts} onChange={setCashReceipts} suffix="₹"/>
        <Field label="Cash payments" value={cashPayments} onChange={setCashPayments} suffix="₹"/>
        <Field label="Trade receivables" value={receivables} onChange={setReceivables} suffix="₹"/>
        <Field label="Inventory" value={inventory} onChange={setInventory} suffix="₹"/>
        <Field label="Trade payables" value={payables} onChange={setPayables} suffix="₹"/>
        <Field label="Short-term debt" value={shortTermDebt} onChange={setShortTermDebt} suffix="₹"/>
      </div><div className="role-note">Use reconciled figures for the same reporting period. This management estimate is not a substitute for a formal cash-flow statement.</div></div>
      <div className="panel role-panel"><h3>Finance Dashboard</h3>{financeResult.error&&<div className="role-note" role="alert">{financeResult.error}</div>}<div className="role-stats">
        <Stat label="Closing cash balance" value={money(finance.cash)}/>
        <Stat label="Net cash flow" value={money(finance.netCashFlow)}/>
        <Stat label="Current assets" value={money(finance.currentAssets)}/>
        <Stat label="Current liabilities" value={money(finance.currentLiabilities)}/>
        <Stat label="Working capital" value={money(finance.workingCapital)}/>
        <Stat label="Current ratio" value={(finance.currentRatio === null ? "N/A" : finance.currentRatio.toFixed(2)+" : 1")}/>
      </div><div className="role-note">Current ratio = current assets ÷ current liabilities. Review ageing, restricted cash, inventory valuation and due dates before funding decisions.</div></div>
    </div>
    <div className="role-grid" style={{marginTop:14}}>
      <div className="panel role-panel"><h3>Loan & EMI Planning</h3><p className="muted">A finance-management tool for assessing repayment commitments.</p><div className="role-fields"><Field label="Loan amount" value={principal} onChange={setPrincipal} suffix="₹"/><Field label="Annual interest rate" value={interest} onChange={setInterest} suffix="%" step="0.01"/><Field label="Loan tenure" value={months} onChange={setMonths} suffix="months"/></div><div className="role-note">EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1). Processing fees, insurance, floating-rate changes and prepayments are excluded.</div></div>
      <div className="panel role-panel"><h3>Debt Repayment Summary</h3>{loanResult.error&&<div className="role-note" role="alert">{loanResult.error}</div>}<div className="role-stats"><Stat label="Monthly EMI" value={money(loan.emi)}/><Stat label="Total repayment" value={money(loan.total)}/><Stat label="Total interest" value={money(loan.totalInterest)}/><Stat label="Principal amount" value={money(n(principal))}/></div><h4>First 12 instalments</h4><div className="role-table-wrap"><table className="role-table"><thead><tr><th>Month</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>{loan.schedule.map(row=><tr key={row.month}><td>{row.month}</td><td>{money(row.emi)}</td><td>{money(row.principal)}</td><td>{money(row.interest)}</td><td>{money(row.balance)}</td></tr>)}</tbody></table></div></div>
    </div></>}
    {tab==="ca"&&<div className="role-grid">
      <div className="panel role-panel"><h3>Chartered Accountant · Tax & Accounts</h3><p className="muted">GST, TDS, depreciation and profit calculations. Rates are editable.</p><h4>GST Calculator</h4><div className="role-fields"><Field label="Amount" value={gstBase} onChange={setGstBase} suffix="₹"/><Field label="GST rate" value={gstRate} onChange={setGstRate} suffix="%" step="0.01"/></div><label className="role-field">Price type<select className="role-select" value={gstMode} onChange={e=>setGstMode(e.target.value)}><option value="exclusive">Add GST (exclusive)</option><option value="inclusive">GST included (inclusive)</option></select></label><hr/><h4>TDS Calculator</h4><div className="role-fields"><Field label="Payment amount" value={tdsBase} onChange={setTdsBase} suffix="₹"/><Field label="TDS rate" value={tdsRate} onChange={setTdsRate} suffix="%" step="0.01"/></div><hr/><h4>Depreciation</h4><div className="role-fields"><Field label="Asset cost" value={assetCost} onChange={setAssetCost} suffix="₹"/><Field label="Salvage value" value={salvage} onChange={setSalvage} suffix="₹"/><Field label="Useful life" value={usefulLife} onChange={setUsefulLife} suffix="years"/></div><label className="role-field">Method<select className="role-select" value={depreciationMethod} onChange={e=>setDepreciationMethod(e.target.value)}><option value="slm">Straight line method (SLM)</option><option value="wdv">Written down value (WDV)</option></select></label>{depreciationMethod==="wdv"&&<Field label="WDV depreciation rate" value={depreciationRate} onChange={setDepreciationRate} suffix="%"/>}<hr/><h4>Profit & Loss</h4><div className="role-fields"><Field label="Revenue" value={revenue} onChange={setRevenue} suffix="₹"/><Field label="Operating expenses" value={expenses} onChange={setExpenses} suffix="₹"/><Field label="Other income" value={otherIncome} onChange={setOtherIncome} suffix="₹"/></div></div>
      <div className="panel role-panel"><h3>Accounting Results</h3>{[gstResult,tdsResult,depreciationResult,profitResult].filter(result=>result.error).map((result,index)=><div className="role-note" role="alert" key={index}>{result.error}</div>)}<h4>GST Summary</h4><div className="role-stats"><Stat label="Taxable value" value={money(ca.base)}/><Stat label="GST amount" value={money(ca.gst)}/><Stat label="Invoice total" value={money(ca.total)}/><Stat label="CGST / SGST" value={money(ca.cgst)+" each"}/></div><h4>TDS Summary</h4><div className="role-stats"><Stat label="TDS deducted" value={money(ca.tds)}/><Stat label="Net payable" value={money(ca.netPayable)}/></div><h4>Depreciation Summary</h4><div className="role-stats"><Stat label="Estimated depreciation" value={money(ca.dep)} note="Per year (SLM) or first-year WDV"/><Stat label="Estimated book value" value={money(ca.bookValue)}/></div><h4>Profit & Loss Summary</h4><div className="role-stats"><Stat label="Profit / (loss)" value={money(ca.profit)}/><Stat label="Profit margin" value={ca.margin.toFixed(2)+"%"}/></div><div className="role-note">TDS rates/sections, thresholds, GST classification and IT Act depreciation rates depend on transaction and current law. WDV here is a simplified first-year estimate using the entered rate; do not use these results as statutory returns or audit schedules.</div></div>
    </div>}
    <p className="role-disclaimer">Planning and estimation tools only. These calculators do not file returns, create statutory payroll, or replace advice from a qualified HR/payroll professional, lender or Chartered Accountant. Verify current Indian tax and labour rules, loan terms and source documents before acting.</p>
  </section>;
}
