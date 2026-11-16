# AI Prompt Library API

The Prompt Library API is mounted at `/api/prompts` in the existing SHIVASHA API. It reuses the existing MongoDB connection, JWT authentication and User model.

## Seed the category directory

From the repository root:

```bash
cd server
npm install
npm run seed:prompt-categories
```

The command uses the existing private `MONGODB_URI` environment variable. It is safe to rerun: categories are upserted by slug.

## Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/prompts/categories` | Public | Active category directory |
| GET | `/api/prompts` | Public | Published prompt search and filters |
| GET | `/api/prompts/:slug` | Public / premium gate | Published prompt detail |
| POST | `/api/prompts` | Login | Submit a draft or prompt for review |
| GET | `/api/prompts/mine` | Login | Current user's prompts |
| GET | `/api/prompts/favorites` | Login | Current user's saved prompts |
| POST | `/api/prompts/:id/favorite` | Login | Save a published prompt |
| DELETE | `/api/prompts/:id/favorite` | Login | Remove a saved prompt |
| POST | `/api/prompts/:id/copy` | Public, free prompts | Increment copy counter |
| GET | `/api/prompts/admin/review` | Admin | Pending moderation queue |
| PATCH | `/api/prompts/admin/:id/review` | Admin | Publish, reject or archive |

### Search parameters

`q`, `category`, `language`, `accessTier`, `featured=true`, `tag`, `page` and `limit` (maximum 50).

### Submit a prompt

Send JSON with `title`, `summary`, `body`, `category`; optional fields include `subcategory`, `tags`, `language`, `difficulty`, `audience`, `instructions`, `exampleOutput` and `variables`. New user submissions are drafts or pending review; only an admin can directly publish.

### Moderation

Admin review body: `{"status":"published" | "rejected" | "archived","reviewNote":"optional note"}`.

The API verifies the current user's database role. Do not rely on frontend-only role checks.

## Current release limits

- Premium prompt detail is currently restricted to admins until a real membership entitlement is connected and verified server-side. Do not advertise paid access as active yet.
- Prompt generator/provider integration and payment checkout are not enabled by this API release.
- User-submitted prompts require admin moderation before public listing.
- The category seed contains the initial 16 top-level categories; prompt content is a separate curated import.
