# EOSS Sadhna Backend

Express + MongoDB backend for EOSS Sadhna.

## Run locally

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Health check:

```
GET http://localhost:5000/api/health
```

The backend currently starts even when MongoDB is not configured. MongoDB authentication and application modules will be added next.


## Content publishing

The authenticated `/api/content` endpoint stores published content metadata in MongoDB and supports filters for Purushartha, House, type, search and the signed-in user's content. The `POST /api/content` endpoint accepts multipart form data and an optional `media` file. Image/video hosting requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` environment variables. Supported files: JPG, PNG, WEBP, GIF, MP4, WEBM and MOV; maximum 50 MB per upload. Do not store media as base64 in MongoDB or commit provider credentials.
