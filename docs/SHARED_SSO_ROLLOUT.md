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
- Existing JSON bearer token response remains for compatibility with current clients.
- HTTP auth accepts existing bearer tokens or the SSO cookie.
- Cookie-authenticated unsafe methods require an exact trusted Origin match. Bearer-token clients are unchanged.
- CORS allows credentials only for the configured frontend origins while SSO is enabled.
- Social frontend includes credentials, restores its session from `GET /api/auth/session`, and can use the cookie for Socket.IO.
- `POST /api/auth/logout` clears the SSO cookie. Other frontends must call this endpoint on logout too.
- The shared session endpoint is informational; every product API still needs server-side product/tenant authorization.

## Rollout checklist

1. Configure DNS and TLS for all four frontend domains and `api.shivasha.com`.
2. Configure the shared API base URL in each frontend build as `https://api.shivasha.com`.
3. Set the API environment variables above and redeploy the API.
4. Update Business, Edutech and Enterprise frontends to use `credentials: "include"` for API requests and call `GET /api/auth/session` during startup.
5. Verify login on Social, then open each other app in the same browser profile and confirm the session is restored without another login.
6. Verify logout from each app clears the shared API cookie; test expired token, blocked account, untrusted Origin, and missing-cookie cases.
7. Keep bearer-token compatibility until all clients are migrated; remove local token persistence only in a separately tested change.

No DNS, production environment, secret, deployment, database, or user record has been changed by this code change.
