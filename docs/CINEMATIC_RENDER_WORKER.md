# SHIVASHA cinematic render worker

The cinematic worker is an optional, self-hosted FFmpeg process. It polls the SHIVASHA API for queued jobs, downloads uploaded Cloudinary videos, applies FFmpeg color grading, uploads an MP4 result to Cloudinary, and reports the result to the API.

## Supported processing

- Cinematic, Natural and Social color grading.
- Original background and original audio passthrough.
- MP4 H.264/AAC output with fast-start metadata.

Background replacement, hairstyle effects, AI audio enhancement, music scoring, smart cuts and selectable 1080p/4K export profiles are not implemented by this worker. Jobs requesting a non-original background or audio mode are marked failed with an explanatory message rather than silently producing an incorrect result.

## Run with Docker Compose

1. Copy `.env.example` to `.env` in the repository root. Keep `.env` private and never commit it.
2. Set `JWT_SECRET` to a long random secret.
3. Set `CINEMATIC_RENDER_WORKER_TOKEN` to a separate long random secret. The same value is passed to the API and worker by Compose.
4. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. Cloudinary stores the uploaded source and rendered MP4 files.
5. Start all services, including the optional worker:

```sh
docker compose --profile cinematic up -d --build
```

6. Inspect worker logs:

```sh
docker compose logs -f cinematic-worker
```

7. Check API capabilities at `/api/cinematic-video/capabilities`. `workerConfigured` confirms that the API has the worker token configured; it does not prove that the worker process is currently running. Confirm the worker logs show that polling has started.

To run only the regular app without the worker, use the ordinary `docker compose up -d --build` command.

## Run the worker outside Docker

Use Node.js 22 or newer and install FFmpeg on the worker host. From the `server` directory, install dependencies and set these private environment variables:

- `SHIVASHA_API_URL`: API base URL reachable by the worker, e.g. `http://localhost:5000` for a local API.
- `CINEMATIC_RENDER_WORKER_TOKEN`: same token configured on the API.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Optional: `CINEMATIC_RENDER_POLL_MS` (minimum 5000 ms) and `FFMPEG_PATH`.

Then run:

```sh
npm install
npm run cinematic:check
npm run cinematic:worker
```

Do not put these secrets in frontend variables such as `VITE_*`, commit them to Git, or share them in screenshots.

## Limits and operational notes

- The API upload endpoint currently accepts MP4, WEBM and MOV up to 50 MB.
- The worker currently downloads source media from Cloudinary HTTPS URLs only.
- Rendered output is uploaded to Cloudinary; provider storage, bandwidth and processing may have costs and limits.
- The worker needs enough RAM, disk space and CPU for FFmpeg. Free hosting tiers may sleep, stop background processes or lack enough resources; verify the host's current limits before relying on it.
- This is a single-worker polling setup. Keep the worker running continuously for jobs to be processed.
- A successful GitHub commit or Docker image build does not prove a live render works. Test with a non-sensitive short sample video after configuring the services.
