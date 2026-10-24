# Shivasha Ad Network — MVP

## Current implementation

- Advertisers use `public/ad-network.html` to create a campaign draft, set the planned budget/duration, and submit it for manual review.
- Campaigns are stored in MongoDB under `ShivashaAdCampaign`.
- Admin review endpoints are available at `GET /api/admin/ads` and `PATCH /api/admin/ads/:id`; these require a logged-in account whose database role is `admin`.
- Approved campaigns with format `Shivasha Social` can be selected by `GET /api/ads/serve?format=Shivasha%20Social`.
- The signed-in community feed inserts an ad slot after every five community posts when an approved campaign is available.
- Clicking a campaign with an HTTPS destination calls `POST /api/ads/:id/click` before opening the destination.
- Campaign owners can view basic impression/click counters in the advertiser portal.

## Important limitations

This is an initial, manually reviewed ad network—not a complete Google Ads or Meta Ads replacement.

- Campaign budget is a plan only. No money is charged or collected.
- No payment gateway, advertiser wallet, invoice/tax calculation, refunds, publisher revenue share, or payout ledger is connected.
- Impressions and clicks are basic counters. They are not fraud-resistant, independently audited, or suitable for billing.
- Only the Shivasha Social feed slot is wired into the app. Search, Display, Video, and Local business are campaign format labels for future placements.
- No auction, bidding, pacing, frequency capping, conversion tracking, campaign schedule enforcement, or guaranteed reach is implemented.
- The review queue is API-only; an authorized admin client must call the documented admin endpoints.
- Public serving/click endpoints should receive rate limiting, abuse monitoring, privacy disclosures, and automated tests before production monetization.

## Required environment and setup

The existing backend must be deployed and connected to MongoDB. The frontend build must point `VITE_API_URL` to the correct backend. The browser portal uses `localStorage.shivasha_auth` for the existing Shivasha login token.

To approve campaigns, sign in with an account whose database `role` is `admin` and use the protected admin API. Never expose admin tokens in frontend source code.


## Create the first admin account

The repository includes `server/scripts/bootstrapAdmin.js`. Run it only from a trusted environment with the production MongoDB URI:

```bash
cd server
MONGODB_URI="your-private-mongodb-uri" ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="use-a-unique-password-at-least-12-characters" npm run admin:bootstrap
```

Use the same email and password to sign in to Shivasha. The script promotes that email to admin and resets its password if the account already exists, so run it intentionally. Do not commit the MongoDB URI or password to GitHub, and remove temporary environment values after running it. If the hosting provider does not provide a secure shell, run the script locally from a trusted computer using the private production database URI, then unset the variables.

The GitHub Pages frontend does not automatically create or grant admin privileges. A 403 response from the admin page means the logged-in database account is not an admin (or the server policy denied the request).

## Production readiness checklist

1. Add rate limiting, bot/duplicate detection, and server-side event validation.
2. Build an admin review screen with advertiser identity, destination preview, rejection reasons, and audit log.
3. Add a payment provider and a server-authoritative wallet/ledger before charging advertisers.
4. Add budget pacing, start/end date enforcement, frequency limits, campaign pause-on-budget rules, and reconciliation.
5. Add privacy policy/terms disclosures, ad content policy, appeal/contact process, data retention, and legal/tax review.
6. Add integration tests for advertiser ownership, admin-only review, rejected/pending campaign non-delivery, and click/impression counters.
7. Verify Render/MongoDB production connectivity and GitHub Pages deployment separately; a successful frontend build does not prove the backend is available.
