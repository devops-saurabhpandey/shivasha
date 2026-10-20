import React, { useMemo, useState } from "react";

const money = n => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:2 }).format(Number.isFinite(n) ? n : 0);
const num = v => Math.max(0, Number(v) || 0);

export default function TaxCalculators() {
  const [tab,setTab]=useState("gst");
  const [amount,setAmount]=useState("10000");
  const [rate,setRate]=useState("18");
  const [mode,setMode]=useState("exclusive");
  const [income,setIncome]=useState("900000");
  const [regime,setRegime]=useState("new");
  const [deductions,setDeductions]=useState("0");
  const [otherAmount,setOtherAmount]=useState("10000");
  const [otherRate,setOtherRate]=useState("5");
  const [otherLabel,setOtherLabel]=useState("Custom tax");
  const gst=useMemo(()=>{const a=num(amount),r=num(rate)/100;const base=mode==="inclusive"?a/(1+r):a;const tax=mode==="inclusive"?a-base:base*r;return {base,tax,total:mode==="inclusive"?a:a+tax,cgst:tax/2,sgst:tax/2}},[amount,rate,mode]);
  const estimatedTax=useMemo(()=>{
    const gross=num(income),ded=regime==="old"?num(deductions):0, taxable=Math.max(0,gross-ded);
    const slabs=regime==="new"?[[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]]:[[250000,0],[500000,.05],[1000000,.20],[Infinity,.30]];
    let tax=0,lower=0;
    for(const [upper,pct] of slabs){const part=Math.max(0,Math.min(taxable,upper)-lower);tax+=part*pct;lower=upper;if(taxable<=upper)break;}
    // New regime rebate estimate for eligible resident individuals; special-rate income and other eligibility rules are not modelled.
    if(regime==="new"&&taxable<=1200000) tax=0;
    const cess=tax*.04;return {taxable,tax,cess,total:tax+cess};
  },[income,regime,deductions]);
  const customTax=num(otherAmount)*num(otherRate)/100;
  const tabs=[["gst","GST Calculator"],["income","Income Tax"],["other","Other Tax"]];
  return <section className="content tax-tools">
    <div className="tax-hero"><div><span className="feed-kicker">SHIVASHA • FINANCE TOOLS</span><h2>Tax Calculators</h2><p>Quick estimates for GST, income tax and custom tax rates.</p></div><span className="tax-hero-icon">₹</span></div>
    <div className="tax-tabs">{tabs.map(([key,label])=><button key={key} className={tab===key?"tax-tab active":"tax-tab"} onClick={()=>setTab(key)}>{label}</button>)}</div>
    {tab==="gst"&&<div className="tax-grid"><div className="panel tax-form"><h3>GST Calculator</h3><p className="muted">Calculate GST added to a price or included in a price.</p><label>Amount (₹)<input inputMode="decimal" type="number" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>GST rate<select value={rate} onChange={e=>setRate(e.target.value)}>{["0","0.1","0.25","1","1.5","3","5","6","12","18","28"].map(x=><option key={x} value={x}>{x}%</option>)}</select></label><div className="tax-mode"><button className={mode==="exclusive"?"selected":""} onClick={()=>setMode("exclusive")}>Add GST</button><button className={mode==="inclusive"?"selected":""} onClick={()=>setMode("inclusive")}>GST included</button></div><small className="muted">For eligible intra-state supplies, GST is split equally into CGST and SGST.</small></div><div className="panel tax-result"><span className="muted">Total amount</span><strong className="tax-total">{money(gst.total)}</strong><div className="tax-line"><span>Taxable amount</span><b>{money(gst.base)}</b></div><div className="tax-line"><span>Total GST ({rate}%)</span><b>{money(gst.tax)}</b></div><div className="tax-line"><span>CGST</span><b>{money(gst.cgst)}</b></div><div className="tax-line"><span>SGST</span><b>{money(gst.sgst)}</b></div><div className="tax-line"><span>IGST (inter-state, indicative)</span><b>{money(gst.tax)}</b></div></div></div>}
    {tab==="income"&&<div className="tax-grid"><div className="panel tax-form"><h3>Income Tax Estimator</h3><p className="muted">Indicative estimate for an individual, Tax Year 2026–27.</p><label>Annual gross income (₹)<input type="number" min="0" value={income} onChange={e=>setIncome(e.target.value)}/></label><label>Tax regime<select value={regime} onChange={e=>setRegime(e.target.value)}><option value="new">New regime (default)</option><option value="old">Old regime (simplified)</option></select></label>{regime==="old"&&<label>Eligible deductions / exemptions (₹)<input type="number" min="0" value={deductions} onChange={e=>setDeductions(e.target.value)}/></label>}<small className="muted">This simplified estimator excludes many special-rate incomes, surcharge, detailed exemptions, credits and individual eligibility conditions.</small></div><div className="panel tax-result"><span className="muted">Estimated tax including cess</span><strong className="tax-total">{money(estimatedTax.total)}</strong><div className="tax-line"><span>Estimated taxable income</span><b>{money(estimatedTax.taxable)}</b></div><div className="tax-line"><span>Income tax after simplified rebate logic</span><b>{money(estimatedTax.tax)}</b></div><div className="tax-line"><span>Health & education cess (4%)</span><b>{money(estimatedTax.cess)}</b></div><div className="tax-line"><span>Monthly equivalent</span><b>{money(estimatedTax.total/12)}</b></div><a className="tax-official-link" href="https://www.incometax.gov.in/" target="_blank" rel="noreferrer">Verify with official Income Tax portal ↗</a></div></div>}
    {tab==="other"&&<div className="tax-grid"><div className="panel tax-form"><h3>Other / Custom Tax</h3><p className="muted">Estimate a tax, duty or surcharge using a rate you enter.</p><label>Tax name<input value={otherLabel} onChange={e=>setOtherLabel(e.target.value)} maxLength="50"/></label><label>Taxable amount (₹)<input type="number" min="0" value={otherAmount} onChange={e=>setOtherAmount(e.target.value)}/></label><label>Rate (%)<input type="number" min="0" max="100" step="0.01" value={otherRate} onChange={e=>setOtherRate(e.target.value)}/></label></div><div className="panel tax-result"><span className="muted">Estimated total with {otherLabel||"tax"}</span><strong className="tax-total">{money(num(otherAmount)+customTax)}</strong><div className="tax-line"><span>Base amount</span><b>{money(num(otherAmount))}</b></div><div className="tax-line"><span>{otherLabel||"Tax"} ({otherRate}%)</span><b>{money(customTax)}</b></div><div className="tax-line"><span>Effective rate</span><b>{num(otherRate).toFixed(2)}%</b></div><small className="muted">Use only for a user-entered rate; this is not an official calculator for TDS, TCS, stamp duty, property tax or customs duty.</small></div></div>}
    <p className="tax-disclaimer">For planning only, not tax, legal or filing advice. Actual tax depends on the applicable law, tax year, taxpayer category, supply type, exemptions and eligibility. Verify rates and final liability on official portals.</p>
  </section>;
}
