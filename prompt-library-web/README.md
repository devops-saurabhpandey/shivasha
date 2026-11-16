# SHIVASHA AI Prompt Library — Standalone Website

This is a separately buildable React/Vite frontend. It shares the Prompt Library UI and existing SHIVASHA API with the main app; it does not create a second database.

## Local development

From the repository root:

```bash
npm install
VITE_API_URL=https://YOUR-SHIVASHA-API.example.com npm run prompt-library:dev
```

On Windows PowerShell, set the variable first:

```powershell
$env:VITE_API_URL = "https://YOUR-SHIVASHA-API.example.com"
npm run prompt-library:dev
```

## Production build

```bash
npm run prompt-library:build
```

Output: `prompt-library-web/dist/`. Deploy that folder to any static host (Nginx, GitHub Pages, Cloudflare Pages, Netlify or another static host). Configure `VITE_API_URL` at build time to the public HTTPS URL of the SHIVASHA API. Add the standalone website's origin to the API `FRONTEND_URL` allowlist before deployment.

The website supports public prompt discovery and its own sign-in/register session. It uses the existing SHIVASHA `/api/auth` endpoints. Browser storage is local to the standalone website origin; a login on the main app does not automatically sign in on a different domain.

## Backend prerequisite

Follow [the API setup guide](../docs/AI_PROMPT_LIBRARY_API.md), including the one-time `npm run seed:prompt-categories` command from the `server/` directory.
