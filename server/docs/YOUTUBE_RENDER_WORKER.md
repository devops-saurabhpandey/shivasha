# SHIVASHA YouTube Render Worker

This worker is designed to run as a separate Node.js 20+ process with FFmpeg installed.
It polls the authenticated backend worker-claim endpoint, renders a claimed manifest using
`scripts/renderYouTubeProject.js`, uploads the MP4 to Cloudinary, and reports completion.

## Required environment

- `SHIVASHA_API_URL`: backend base URL, for example `https://your-api.example.com`
- `YOUTUBE_RENDER_WORKER_TOKEN`: same secret configured on the backend
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `YOUTUBE_RENDER_POLL_MS`: optional polling interval, default 15000

## Worker protocol

1. Poll `POST /api/youtube/projects/render-worker-claim` using the worker token.
2. If a job is returned, write its manifest to a temporary JSON file.
3. Run `npm run youtube:render -- <manifest.json> <output.mp4>`.
4. Upload the MP4 to Cloudinary as a video resource.
5. Report `completed` with its HTTPS URL to `POST /api/youtube/projects/render-worker-result`.
6. On any failure, report `failed` with a short error message.\n\nThe backend automatically re-queues a `running` job whose `renderStartedAt` is older than 45 minutes. This is crash recovery, not a guarantee against duplicate work if a render exceeds that window.

## Important deployment notes

- This is not a serverless request handler: FFmpeg needs a persistent worker process.
- The worker must run on a machine/container with FFmpeg installed and enough temporary disk.
- Cloudinary and AI providers may have free-tier limits; this does not guarantee unlimited free operation.
- Do not expose the worker token in the frontend or public repository.
- Keep the worker process supervised (for example, with a container restart policy or process manager). The backend has a 45-minute stale-job recovery window; consider tuning it if long renders are expected.
