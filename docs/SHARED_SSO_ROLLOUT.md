# SHIVASHA Cross-Subdomain SSO

Status: cookie-backed SSO support is implemented in the shared API and Social frontend. It remains opt-in until production domains and environment settings are verified.

## Intended topology

- Frontends: `social.shivasha.com`, `business.shivasha.com`, `edutech.shivasha.com`, `enterprise.shivasha.com`
- Shared API: preferably `api.shivasha.com` (custom domain on the API host).
- One API origin and one identity database serve all four frontends.

Using an API hostname under `shivasha.com` keeps the frontends and API same-site. If the API stays on a provider hostname such as `*.onrender.com`, browser third-party-cookie restrictions can prevent reliable SSO; configure a first-party API custom domain before enabling production SSO.

## Required API environment

Set these only after the four frontend domains and API custom domain are provisioned:

```env
AUTH_COOKIE_SSO=true
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
FRONTEND_URL=https://social.shivasha.com,https://business.shivasha.com,https://edutech.shivasha.com,https://enterprise.shivasha.com
```

Do not set `AUTH_COOKIE_DOMAIN` by default. The cookie is host-only to the API host and is sent to that same API by all four frontends. This reduces exposure to sibling subdomains. Only set a cookie domain after a reviewed requirement demonstrates it is necessary.

If using an API host outside `shivasha.com`, `SameSite=None; Secure` may be required, but browser third-party-cookie blocking still makes this topology unreliable. Prefer `api.shivasha.com`.

## Behavior

- Successful login issues an HttpOnly `shivasha_sso` cookie (7-day lifetime) when `AUTH_COOKIE_SSO=true`.
- When `AUTH_COOKIE_SSO=true`, browser login returns an HttpOnly cookie and omits the JWT from JSON; when SSO is disabled, the legacy JSON bearer-token response remains available.
- HTTP auth accepts existing bearer tokens or the SSO cookie.
- Cookie-authenticated unsafe methods require an exact trusted Origin match. Bearer-token clients are unchanged.
- CORS allows credentials only for the configured frontend origins while SSO is enabled.
- Social frontend includes credentials, restores its session from `GET /api/auth/session`, stores no JWT for cookie-authenticated sessions, and uses the cookie for Socket.IO.
- All four migration-stage product portals check the same session, show the signed-in identity, link to the app suite, and provide shared logout. The Business, Edutech and Enterprise portals are still migration-stage portals, not complete product runtimes.
- `POST /api/auth/logout` clears the SSO cookie and, while SSO is enabled, requires an exact trusted frontend Origin. Other frontends must call this endpoint on logout too.
- The shared session endpoint is informational; every product API still needs server-side product/tenant authorization.

## Rollout checklist

1. Configure DNS and TLS for all four frontend domains and `api.shivasha.com`.
2. Configure the shared API base URL in each frontend build as `https://api.shivasha.com`.
3. Set the API environment variables above and redeploy the API.
4. When those portals become full product runtimes, preserve `credentials: "include"` and call `GET /api/auth/session` during startup in their API clients.
5. Verify login on Social, then open each other app in the same browser profile and confirm the session is restored without another login.
6. Verify logout from each app clears the shared API cookie; test expired token, blocked account, untrusted Origin, and missing-cookie cases.
7. Keep legacy bearer-token compatibility while SSO is disabled. With SSO enabled, browser logins must never receive or persist a JWT; verify the response contains no `token` field and browser storage contains no bearer secret.

No DNS, production environment, secret, deployment, database, or user record has been changed by this code change.
