import React, { useMemo, useState } from "react";

const n = value => Math.max(0, Number(value) || 0);
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
const Field = ({ label, value, onChange, suffix = "", step = "1", min = "0" }) => <label className="role-field">{label}<div className="role-input-wrap"><input type="number" min={min} step={step} value={value} onChange={e => onChange(e.target.value)} /><span>{suffix}</span></div></label>;
const Stat = ({ label, value, note }) => <div className="role-stat"><small>{label}</small><strong>{value}</strong>{note && <span>{note}</span>}</div>;

export default function RoleCalculators() {
  const [tab, setTab] = useState("hr");
  const [basic, setBasic] = useState("30000"), [hra, setHra] = useState("12000"), [allowance, setAllowance] = useState("5000");
  const [employeePf, setEmployeePf] = useState("12"), [employerPf, setEmployerPf] = useState("12"), [professionalTax, setProfessionalTax] = useState("200");
  const [esiEnabled, setEsiEnabled] = useState(false), [esiEmployee, setEsiEmployee] = useState("0.75"), [esiEmployer, setEsiEmployer] = useState("3.25");
  const [principal, setPrincipal] = useState("1000000"), [interest, setInterest] = useState("9"), [months, setMonths] = useState("120");
  const [gstBase, setGstBase] = useState("100000"), [gstRate, setGstRate] = useState("18"), [gstMode, setGstMode] = useState("exclusive");
  const [tdsBase, setTdsBase] = useState("50000"), [tdsRate, setTdsRate] = useState("10");
  const [assetCost, setAssetCost] = useState("500000"), [salvage, setSalvage] = useState("50000"), [usefulLife, setUsefulLife] = useState("5"), [depreciationMethod, setDepreciationMethod] = useState("slm"), [depreciationRate, setDepreciationRate] = useState("15");
  const [revenue, setRevenue] = useState("500000"), [expenses, setExpenses] = useState("320000"), [otherIncome, setOtherIncome] = useState("10000");
  const [openingCash, setOpeningCash] = useState("250000"), [cashReceipts, setCashReceipts] = useState("600000"), [cashPayments, setCashPayments] = useState("420000");
  const [receivables, setReceivables] = useState("180000"), [inventory, setInventory] = useState("120000"), [payables, setPayables] = useState("90000"), [shortTermDebt, setShortTermDebt] = useState("60000");

  const hr = useMemo(() => {
    const b=n(basic), h=n(hra), a=n(allowance), gross=b+h+a;
    const epf=b*n(employeePf)/100, cpf=b*n(employerPf)/100;
    const esiBase=esiEnabled ? gross : 0, ee=esiBase*n(esiEmployee)/100, er=esiBase*n(esiEmployer)/100;
    const pt=n(professionalTax), deductions=epf+ee+pt;
    return {gross, epf, cpf, ee, er, pt, deductions, net:gross-deductions, annualGross:gross*12, ctc:(gross+cpf+er)*12, annualNet:(gross-deductions)*12};
  },[basic,hra,allowance,employeePf,employerPf,professionalTax,esiEnabled,esiEmployee,esiEmployer]);

  const loan = useMemo(() => {
    const p=n(principal), rate=n(interest)/1200, count=Math.max(0,Math.floor(n(months)));
    if (!p || !count) return {emi:0,total:0,totalInterest:0,schedule:[]};
    const emi=rate===0?p/count:p*rate*Math.pow(1+rate,count)/(Math.pow(1+rate,count)-1);
    let balance=p; const schedule=[];
    for(let month=1;month<=Math.min(count,12);month++){
      const interestPart=balance*rate, principalPart=Math.min(balance,emi-interestPart);
      balance=Math.max(0,balance-principalPart);
      schedule.push({month,emi,principal:principalPart,interest:interestPart,balance});
    }
    return {emi,total:emi*count,totalInterest:emi*count-p,schedule};
  },[principal,interest,months]);

  const ca = useMemo(() => {
    const entered=n(gstBase), r=n(gstRate)/100, base=gstMode==="inclusive"?entered/(1+r):entered;
    const gst=gstMode==="inclusive"?entered-base:base*r;
    const tds=n(tdsBase)*n(tdsRate)/100;
    const cost=n(assetCost), residual=Math.min(cost,n(salvage)), life=Math.max(1,n(usefulLife));
    const dep=depreciationMethod==="slm"?(cost-residual)/life:cost*(n(depreciationRate)/100);
    const bookValue=Math.max(residual,cost-dep);
    const profit=n(revenue)+n(otherIncome)-n(expenses);
    return {base,gst,total:gstMode==="inclusive"?entered:base+gst,cgst:gst/2,sgst:gst/2,tds,netPayable:n(tdsBase)-tds,dep,bookValue,profit,margin:n(revenue)>0?profit/n(revenue)*100:0};
  },[gstBase,gstRate,gstMode,tdsBase,tdsRate,assetCost,salvage,usefulLife,depreciationMethod,depreciationRate,revenue,expenses,otherIncome]);

  const finance = useMemo(() => {
    const cash=n(openingCash)+n(cashReceipts)-n(cashPayments);
    const currentAssets=cash+n(receivables)+n(inventory);
    const currentLiabilities=n(payables)+n(shortTermDebt);
    return {cash,netCashFlow:n(cashReceipts)-n(cashPayments),currentAssets,currentLiabilities,workingCapital:currentAssets-currentLiabilities,currentRatio:currentLiabilities>0?currentAssets/currentLiabilities:0};
  },[openingCash,cashReceipts,cashPayments,receivables,inventory,payables,shortTermDebt]);

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
      <div className="panel role-panel"><h3>Salary Summary</h3><div className="role-stats"><Stat label="Monthly gross salary" value={money(hr.gross)}/><Stat label="Monthly take-home" value={money(hr.net)}/><Stat label="Annual gross salary" value={money(hr.annualGross)}/><Stat label="Annual take-home" value={money(hr.annualNet)}/><Stat label="Employee PF deduction" value={money(hr.epf)}/><Stat label="Employer PF contribution" value={money(hr.cpf)}/><Stat label="Total monthly deductions" value={money(hr.deductions)}/><Stat label="Estimated annual CTC" value={money(hr.ctc)}/></div><p className="muted">ESI employee deduction: {money(hr.ee)} · Employer ESI: {money(hr.er)}</p><div className="role-note">PF/ESI eligibility, wage ceiling, basic-wage definition, professional tax and exemptions vary by law and employee circumstances. Confirm current statutory rules before payroll processing.</div></div>
    </div>}
    {tab==="loan"&&<div className="role-grid">
      <div className="panel role-panel"><h3>Loan Manager · EMI Calculator</h3><p className="muted">Calculate reducing-balance monthly EMI and first-year repayment schedule.</p><div className="role-fields"><Field label="Loan amount" value={principal} onChange={setPrincipal} suffix="₹"/><Field label="Annual interest rate" value={interest} onChange={setInterest} suffix="%" step="0.01"/><Field label="Loan tenure" value={months} onChange={setMonths} suffix="months"/></div><div className="role-note">EMI = P × r × (1+r)^n ÷ ((1+r)^n − 1), where r is monthly interest and n is number of monthly instalments. Processing fees, insurance, floating-rate changes and prepayments are not included.</div></div>
      <div className="panel role-panel"><h3>Loan Summary</h3><div className="role-stats"><Stat label="Monthly EMI" value={money(loan.emi)}/><Stat label="Total repayment" value={money(loan.total)}/><Stat label="Total interest" value={money(loan.totalInterest)}/><Stat label="Principal amount" value={money(n(principal))}/></div><h4>First 12 instalments</h4><div className="role-table-wrap"><table className="role-table"><thead><tr><th>Month</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>{loan.schedule.map(row=><tr key={row.month}><td>{row.month}</td><td>{money(row.emi)}</td><td>{money(row.principal)}</td><td>{money(row.interest)}</td><td>{money(row.balance)}</td></tr>)}</tbody></table></div></div>
    </div>}
    {tab==="ca"&&<div className="role-grid">
      <div className="panel role-panel"><h3>Chartered Accountant · Tax & Accounts</h3><p className="muted">GST, TDS, depreciation and profit calculations. Rates are editable.</p><h4>GST Calculator</h4><div className="role-fields"><Field label="Amount" value={gstBase} onChange={setGstBase} suffix="₹"/><Field label="GST rate" value={gstRate} onChange={setGstRate} suffix="%" step="0.01"/></div><label className="role-field">Price type<select className="role-select" value={gstMode} onChange={e=>setGstMode(e.target.value)}><option value="exclusive">Add GST (exclusive)</option><option value="inclusive">GST included (inclusive)</option></select></label><hr/><h4>TDS Calculator</h4><div className="role-fields"><Field label="Payment amount" value={tdsBase} onChange={setTdsBase} suffix="₹"/><Field label="TDS rate" value={tdsRate} onChange={setTdsRate} suffix="%" step="0.01"/></div><hr/><h4>Depreciation</h4><div className="role-fields"><Field label="Asset cost" value={assetCost} onChange={setAssetCost} suffix="₹"/><Field label="Salvage value" value={salvage} onChange={setSalvage} suffix="₹"/><Field label="Useful life" value={usefulLife} onChange={setUsefulLife} suffix="years"/></div><label className="role-field">Method<select className="role-select" value={depreciationMethod} onChange={e=>setDepreciationMethod(e.target.value)}><option value="slm">Straight line method (SLM)</option><option value="wdv">Written down value (WDV)</option></select></label>{depreciationMethod==="wdv"&&<Field label="WDV depreciation rate" value={depreciationRate} onChange={setDepreciationRate} suffix="%"/>}<hr/><h4>Profit & Loss</h4><div className="role-fields"><Field label="Revenue" value={revenue} onChange={setRevenue} suffix="₹"/><Field label="Operating expenses" value={expenses} onChange={setExpenses} suffix="₹"/><Field label="Other income" value={otherIncome} onChange={setOtherIncome} suffix="₹"/></div></div>
      <div className="panel role-panel"><h3>Accounting Results</h3><h4>GST Summary</h4><div className="role-stats"><Stat label="Taxable value" value={money(ca.base)}/><Stat label="GST amount" value={money(ca.gst)}/><Stat label="Invoice total" value={money(ca.total)}/><Stat label="CGST / SGST" value={money(ca.cgst)+" each"}/></div><h4>TDS Summary</h4><div className="role-stats"><Stat label="TDS deducted" value={money(ca.tds)}/><Stat label="Net payable" value={money(ca.netPayable)}/></div><h4>Depreciation Summary</h4><div className="role-stats"><Stat label="Estimated depreciation" value={money(ca.dep)} note="Per year (SLM) or first-year WDV"/><Stat label="Estimated book value" value={money(ca.bookValue)}/></div><h4>Profit & Loss Summary</h4><div className="role-stats"><Stat label="Profit / (loss)" value={money(ca.profit)}/><Stat label="Profit margin" value={ca.margin.toFixed(2)+"%"}/></div><div className="role-note">TDS rates/sections, thresholds, GST classification and IT Act depreciation rates depend on transaction and current law. WDV here is a simplified first-year estimate using the entered rate; do not use these results as statutory returns or audit schedules.</div></div>
    </div>}
    <p className="role-disclaimer">Planning and estimation tools only. These calculators do not file returns, create statutory payroll, or replace advice from a qualified HR/payroll professional, lender or Chartered Accountant. Verify current Indian tax and labour rules, loan terms and source documents before acting.</p>
  </section>;
}
