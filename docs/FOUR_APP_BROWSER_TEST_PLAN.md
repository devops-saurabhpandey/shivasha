# Four-App SSO Browser Verification Plan

## Purpose

Verify the shared cookie-based session in a real browser after the four HTTPS frontend origins and the shared HTTPS API hostname are provisioned. Automated Node.js integration tests validate the API contract; this checklist covers browser cookie policy, frontend state, navigation and logout behavior.

## Required staging setup

Use staging domains that mirror the production topology:

- Social: `https://social.staging.shivasha.com`
- Business: `https://business.staging.shivasha.com`
- Edutech: `https://edutech.staging.shivasha.com`
- Enterprise: `https://enterprise.staging.shivasha.com`
- Shared API: `https://api.staging.shivasha.com`

The exact hostnames may be changed to the staging names provisioned by the platform team. All frontend builds must use the same API URL.

Configure the API only in staging:

```env
AUTH_COOKIE_SSO=true
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
FRONTEND_URL=https://social.staging.shivasha.com,https://business.staging.shivasha.com,https://edutech.staging.shivasha.com,https://enterprise.staging.shivasha.com
```

Do not set a cookie Domain unless the deployment architecture specifically requires it. Keep the cookie host-only on the shared API hostname. Use HTTPS for every origin. Do not use an external provider hostname such as a different `*.onrender.com` site for the API; browser third-party-cookie restrictions can break this topology.

## Browser test cases

Run each case in a fresh browser context first, then repeat with an existing session.

| ID | Test | Expected result |
|---|---|---|
| B01 | Open each product origin while signed out | Correct product portal loads; no authenticated UI is shown |
| B02 | Sign in from Social | Login succeeds; response does not expose a bearer JWT; HttpOnly SSO cookie is set for the API host |
| B03 | Open Business, Edutech and Enterprise in the same browser | Each app restores the same signed-in identity through `GET /api/auth/session` |
| B04 | Refresh each app | Session remains restored; no login loop |
| B05 | Sign out from Business | API clears the SSO cookie; app shows signed-out state only after successful logout |
| B06 | Return to Social, Edutech and Enterprise after B05 | Each app shows signed-out state after session revalidation |
| B07 | Force logout API to return 500/network failure | Current app does not falsely clear its local signed-in state; visible error is shown |
| B08 | Expire or invalidate the session cookie | Session endpoint rejects it; app clears stale identity and asks user to sign in |
| B09 | Use a blocked/suspended test account | Session is rejected and protected product content is not accessible |
| B10 | Send login/logout from an untrusted Origin | API rejects the request |
| B11 | Inspect browser storage | No SSO JWT is stored in localStorage or sessionStorage |
| B12 | Inspect cookie attributes | Cookie is HttpOnly, Secure, SameSite=Lax; host-only unless explicitly approved |
| B13 | Open browser developer tools and inspect network requests | Frontend API requests use credentials; CORS allows only the four configured origins |
| B14 | Open a product page directly in a new tab | Host routing selects the intended product; server-side product authorization remains enforced |

## Evidence to record

For each case record:

- Browser and version
- Staging build/commit SHA
- Product origin and API origin
- Pass/fail and timestamp
- Sanitized screenshot or network trace with cookies, authorization headers, personal data and tokens redacted
- Console errors and failed request status codes

Never paste live cookies, JWTs, passwords, session identifiers or production user data into an issue or chat.

## Release gate

Do not mark cross-domain SSO production-ready until:

1. All B01-B14 cases pass on current Chrome and at least one additional supported browser.
2. The four product origins and shared API use HTTPS and exact CORS allowlisting.
3. Login, session restore, logout, expiry and blocked-account flows pass.
4. No tokens or session secrets appear in browser-readable storage or logs.
5. The release owner explicitly approves production configuration and deployment.

## Current status

- Node.js API integration tests cover all four trusted product origins and untrusted-Origin rejection.
- GitHub Actions backend tests and frontend production builds have passed for the current PR head.
- Real-browser verification has not yet been run.
- Staging DNS, TLS, API hostname and deployment are not configured by this checklist.
