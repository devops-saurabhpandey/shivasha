const asNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

// These are review prompts, not fraud findings. Never auto-reject or withhold a
// commission solely because a signal is present.
export function buildAffiliateRiskSignals({ grossAmount, ratePercent, clicksLastHour = 0, buyerConversionsLastDay = 0 } = {}) {
  const signals = [];
  if (Number(grossAmount) >= 500000) signals.push({ code: "high_transaction_value", severity: "review", message: "High-value transaction; verify settlement and buyer evidence." });
  if (Number(ratePercent) > 30) signals.push({ code: "unusual_commission_rate", severity: "review", message: "Commission rate exceeds the usual review threshold of 30%." });
  if (asNumber(clicksLastHour) >= 1000) signals.push({ code: "click_spike", severity: "review", message: "Unusually high referral-click volume in the last hour." });
  if (asNumber(buyerConversionsLastDay) >= 3) signals.push({ code: "buyer_conversion_burst", severity: "review", message: "Several conversions for the same buyer in 24 hours; confirm each is a separate genuine purchase." });
  return signals;
}

export default buildAffiliateRiskSignals;
