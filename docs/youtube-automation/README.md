# SHIVASHA YouTube Automation

This module is an additive first-stage implementation plan and API contract for creating, reviewing, scheduling, and publishing Shorts and long-form videos.

## Product flow

1. Create a project with topic, language, format (Short or Long), target duration, audience, and channel.
2. Generate an editable script and metadata (title, description, tags, hashtags) using a configured AI provider.
3. Prepare assets: voice-over, captions, thumbnail, and video render. Each provider is optional and must be configured server-side.
4. Preview and approve the finished video.
5. Connect a YouTube channel through Google OAuth; request only the scopes required for upload and channel analytics.
6. Schedule or publish approved videos through the YouTube Data API.
7. Track upload status and permitted channel/video analytics.

## Safety and compliance

- Never publish generated content without explicit user approval; scheduling is an explicit user action.
- Keep Google OAuth tokens and AI provider keys on the server, encrypted at rest; never expose them in frontend code.
- Respect YouTube API quotas, copyright, privacy, community guidelines, and synthetic-content disclosure requirements where applicable.
- Do not scrape YouTube or automate engagement (views, likes, comments, subscriptions).
- Show provider costs/free-tier limits before invoking paid services.
- Use an upload state machine: draft → script_ready → assets_ready → rendered → approved → scheduled/uploading → published/failed.
- Store an audit record for approvals, schedule changes, uploads, and token revocation.

## Initial API contract

All endpoints require the app's existing authenticated session, except OAuth callback.

- `GET /api/youtube-automation/status` — module readiness and connected channel status.
- `POST /api/youtube-automation/projects` — create a project.
- `GET /api/youtube-automation/projects` — list the current user's projects.
- `GET /api/youtube-automation/projects/{id}` — project details and workflow status.
- `POST /api/youtube-automation/projects/{id}/script` — generate or regenerate script and metadata.
- `POST /api/youtube-automation/projects/{id}/render` — enqueue render job after assets are configured.
- `POST /api/youtube-automation/projects/{id}/approve` — record explicit approval.
- `POST /api/youtube-automation/projects/{id}/schedule` — schedule approved video.
- `POST /api/youtube-automation/projects/{id}/publish` — publish approved video now.
- `GET /api/youtube-automation/projects/{id}/analytics` — fetch available analytics.
- `GET /api/youtube-automation/oauth/google/start` and callback — connect channel using OAuth.

## Configuration (server-side only)

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `YOUTUBE_TOKEN_ENCRYPTION_KEY`
- `AI_PROVIDER` and provider-specific secret
- Optional voice, media, and rendering provider credentials

No secrets belong in Vite `VITE_*` variables or committed files.

## Delivery phases

1. Add navigation and dashboard UI integrated with the existing app layout/auth.
2. Add database models, authenticated API routes, and background job queue.
3. Add script generation provider adapter.
4. Add media/voice/caption/render adapters and preview.
5. Add Google OAuth, upload, scheduling, retries, and status updates.
6. Add analytics, tests, deployment configuration, and security review.

This contract does not claim that OAuth, rendering, or publishing is live until those integrations are implemented and configured.
