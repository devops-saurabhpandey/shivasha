# SHIVASHA Affiliate Risk Review

## Admin endpoint

Authenticated administrators can review pending affiliate commission candidates at:

`GET /api/affiliates/risk-review`

The endpoint returns up to 200 pending commission records with explainable advisory signals and context counts. Current signals are:

- High transaction value (amount threshold currently 500,000 in the stored transaction amount; review threshold only).
- Commission rate above 30%.
- At least 1,000 tracked referral clicks in the previous hour.
- At least 3 pending/approved conversions for the same partner and buyer in the previous 24 hours.

## Fair-review safeguards

- Signals are prompts for manual verification, not a fraud verdict.
- A signal never automatically rejects, reverses, freezes or delays a commission.
- Administrators must inspect source transaction and consent records and consider the partner's explanation.
- Existing admin approve/reverse workflow remains the only commission status transition.
- The system does not collect IP addresses, device fingerprints or additional personal data for this feature.
- Click volume can be affected by legitimate campaigns, bots, previews or link scanners; it must not be treated as proof of abuse.
- Thresholds are initial operational defaults and should be reviewed against real traffic before production use.

## Limitations

This is an explainable rules-based risk triage, not machine-learning fraud detection. It does not identify shared devices or IPs, does not auto-block users, and does not initiate payouts or refunds. Payment gateway remains deferred.
