# SHIVASHA Social Platform API Setup

This document is the setup checklist for adding official social-platform integrations to SHIVASHA. A platform is not connected merely because its API is listed here. Real access requires valid developer-app credentials, user authorization, and any platform review/approval.

## Recommended implementation order

1. YouTube Data API v3 — start with public channel/video data using a Google Cloud project and API key. Private analytics and account actions require OAuth consent.
2. Meta (Facebook Pages + Instagram professional accounts) — create a Meta developer app and configure the exact permissions and login flow needed. App review/business verification may be required.
3. LinkedIn — access is product/permission dependent; apply for the relevant products and do not assume organization analytics or posting access is granted.
4. WhatsApp Business Platform — intended for approved business messaging and opted-in recipients; it is not a general follower-count API.

## Required security rules

- Never put client secrets, access tokens, refresh tokens, or WhatsApp tokens in React/Vite frontend code.
- Never commit real secrets to GitHub or paste them into public issues/chat.
- Store secrets only in the private backend environment (for example, the host's environment-variable settings).
- Use OAuth state, validate callback URLs, encrypt/persist refresh tokens where supported, and provide a disconnect/revoke action.
- Request the smallest permissions necessary and show clear consent before connecting an account.
- Do not scrape platforms, import contacts without permission, auto-follow users, or send unsolicited messages.
- Treat unsupported metrics as unavailable; never fabricate follower counts or report an account as connected before a successful authorization.

## Backend environment variables (names only; values must be configured privately)

```dotenv
YOUTUBE_API_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=

META_APP_ID=
META_APP_SECRET=
META_OAUTH_REDIRECT_URI=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_OAUTH_REDIRECT_URI=

WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
```

These variable names are a planning template only; no live integration is enabled until backend OAuth/API routes, token storage, permission checks, UI status, and platform-specific tests are implemented.

## Official documentation

- YouTube Data API: https://developers.google.com/youtube/v3/docs
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- Meta Graph API: https://developers.facebook.com/docs/graph-api/
- Instagram Platform: https://developers.facebook.com/docs/instagram-platform/
- LinkedIn developer documentation: https://learn.microsoft.com/linkedin/
- WhatsApp Business Platform: https://developers.facebook.com/docs/whatsapp/

## Free-hosting note

API access may be free within quotas, but hosting, database persistence, verification, or usage can have separate limits or costs. The current SHIVASHA frontend calls a backend hosted at https://shivasha.onrender.com by default unless VITE_API_URL is configured. Do not promise always-on operation or zero cost without verifying the actual hosting and database setup.