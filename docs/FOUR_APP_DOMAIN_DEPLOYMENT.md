# Shivasha Four-App Domain Foundation

Status: domain routing foundation implemented; public DNS, certificates and production deployment remain operational tasks.

## Public application URLs

| Product | Public hostname | Frontend entry |
| --- | --- | --- |
| Shivasha Social | `social.shivasha.com` | `index.html` |
| Shivasha Business | `business.shivasha.com` | `business.html` |
| Shivasha Edutech | `edutech.shivasha.com` | `edutech.html` |
| Shivasha Enterprise | `enterprise.shivasha.com` | `enterprise.html` |

The four hostnames are the approved target names. Their ownership, DNS records and TLS certificates must be verified in the domain/DNS provider before public launch; this repository change does not register a domain or create DNS records.

## Shared services

All four web frontends may use the same versioned API origin, configured as `VITE_API_BASE_URL` at build time. The API and MongoDB remain shared infrastructure, while product data and permissions remain separated by product and tenant.

Recommended API hostname: `api.shivasha.com`. Configure it only after the API deployment and TLS endpoint are verified.

## Host routing

The static Node server maps the request Host header to the matching Vite HTML entry. Product host overrides are available through:

- `SHIVASHA_SOCIAL_HOST`
- `SHIVASHA_BUSINESS_HOST`
- `SHIVASHA_EDUTECH_HOST`
- `SHIVASHA_ENTERPRISE_HOST`

If a hostname is unknown or two products are configured with the same hostname, the resolver does not select a product. The legacy/default deployment continues to serve the Social entry point for compatibility.

Host routing is presentation routing only. Never use the Host header to grant user access. Authentication, product membership, role checks and tenant isolation must be enforced by API middleware and domain services.

## DNS and TLS checklist

Create DNS records only after confirming the hosting target:

1. Point each application hostname to the chosen frontend hosting service using the provider's documented CNAME/A/ALIAS instructions.
2. Point `api.shivasha.com` to the verified shared API service separately.
3. Enable HTTPS and verify a valid certificate for every hostname.
4. Configure the API CORS allowlist with the four exact HTTPS origins; do not use wildcard origins with credentials.
5. Set the same verified API base URL in each frontend build environment.
6. Verify login, logout, session refresh, deep links, static assets and API calls on all four HTTPS hostnames.

Do not point DNS to a temporary Render/WSL/local address. Do not change the existing production domain or environment variables until all four hostnames pass smoke tests.

## Release and rollback

The current Vite build emits four HTML entry points from one repository build. This provides separate hostname entry points but does not yet provide independent deployment pipelines or independent release cadence. Those are later deployment tasks.

Keep the existing Social hostname/service operational during rollout. Roll back by restoring the previous hosting configuration and DNS target; do not delete user records, MongoDB collections or existing routes as part of a frontend rollback.
