# SHIVASHA AI Prompt Library — Product & Technical Plan

## Product goal

Build one centrally managed AI Prompt Library available in two independently usable experiences:
1. An integrated module inside the existing SHIVASHA React application.
2. A standalone, independently deployable Prompt Library website.

Both clients must use the existing SHIVASHA Node.js/Express API and MongoDB/Mongoose data store. Do not create a second user database or duplicate prompt catalogue. Reuse existing JWT authentication and authorization conventions. Keep the current social app and existing API routes backward compatible.

## Repository architecture

- `src/`: add the authenticated SHIVASHA Prompt Library module and navigation entry.
- `server/`: add prompt/category/collection models, validation, controllers and Express routes.
- `prompt-library-web/`: standalone React + Vite frontend, with its own build configuration and deployment instructions. It consumes the shared API and can be deployed separately from the main app.
- `docs/`: setup, API, content governance, deployment and operator documentation.

The secure-cloud-server repository remains the infrastructure/deployment project. The existing SHIVASHA repository is the application and API source of truth.

## Main categories

1. Business & Entrepreneurship
2. Marketing, Advertising & Sales
3. Social Media & Creator Growth
4. Content Writing, Copywriting & Storytelling
5. SEO, Blogging & Website
6. Software Development & Coding
7. IT, Cloud, DevOps & Cybersecurity
8. AI, Automation & Agents
9. Education, Teaching & Research
10. Career, Jobs & Productivity
11. Finance, Accounting & Money Management
12. E-commerce & Customer Support
13. Design, UI/UX & Branding
14. Health, Wellness & Ayurveda (general educational information only)
15. Spirituality, Self-Knowledge & Daily Reflection
16. General Purpose, Translation & Language Learning

Every category supports subcategories, tags, language, difficulty, audience and use-case filters. Support Hindi, English and multilingual content.

## User features

- Browse published prompts without signing in.
- Search by title, description, prompt body, category, tags and language.
- Filter by category, subcategory, language, free/premium, popularity and newest.
- Prompt detail page with full prompt, variables, usage instructions and examples.
- Copy prompt, share link, report content and rate/review where signed in.
- Save favourites and personal collections.
- Submit a prompt; edit own drafts; track moderation status.
- Create a prompt from a guided template with title, purpose, role, context, instructions, constraints, output format and variables.
- Prompt Generator interface with optional AI provider integration on the server only.
- Hindi/English interface and prompt content.
- Responsive mobile-first layout and accessible keyboard interactions.

## Admin and moderation

- Admin-only dashboard for categories, subcategories, prompts, tags and collections.
- Draft, pending review, published, rejected, archived and flagged states.
- Review queue, edit, approve, reject with reason, feature/promote and archive.
- Report handling, abuse controls, audit trail and aggregate usage analytics.
- Seed and import workflow with duplicate detection.
- Never allow user-submitted content to become public without the configured moderation policy.

## Membership and monetization

- Clearly label Free and Premium content.
- Enforce premium access on the API, not only by hiding frontend controls.
- Keep plan entitlements configurable.
- Do not integrate a payment gateway or claim a subscription is purchasable until the owner selects and configures a payment provider.
- Keep the core browse/search/copy experience usable for free prompts.

## Initial data model

- Prompt: title, slug, summary, body/template, variables, instructions, examples, categoryId, subcategoryId, tags, language, difficulty, audience, accessTier, status, authorId, moderation metadata, featured flag, counters, timestamps and version.
- PromptCategory: name, slug, description, icon, parentId, sortOrder, active.
- PromptCollection: ownerId, name, description, visibility and ordered prompt references.
- PromptFavorite: userId + promptId with a unique compound index.
- PromptReview: userId, promptId, rating, text and moderation state.
- PromptReport: reporterId, promptId, reason, details and resolution state.
- PromptUsageEvent: promptId, userId when available, action and timestamp; aggregate analytics and avoid collecting unnecessary personal data.

Use Mongoose references and indexes for slug uniqueness, published discovery, category/language/tier filters, tags and user favourites. Validate and normalize all input server-side.

## Initial API contract

- `GET /api/prompts` — paginated public discovery with search and filters.
- `GET /api/prompts/:slug` — published prompt detail subject to access tier.
- `POST /api/prompts` — authenticated prompt submission/draft.
- `PATCH /api/prompts/:id` — owner/admin update with permission checks.
- `POST /api/prompts/:id/favorite` and `DELETE /api/prompts/:id/favorite`.
- `POST /api/prompts/:id/reviews` and `POST /api/prompts/:id/reports`.
- `GET /api/prompt-categories` — active category tree.
- `GET /api/prompt-collections/me` and collection CRUD for the signed-in owner.
- `POST /api/prompt-generator` — optional server-side AI generation, protected by rate limits and configured provider credentials.
- `/api/admin/prompts/*` — admin-only moderation and management endpoints.

Use the repository's existing JWT middleware and admin-role checks after inspecting their exact implementation. Add pagination limits, rate limits, request validation, safe error responses and tests. Never expose provider API keys to browser code.

## Seed content target

Create a curated, quality-checked starter catalogue targeting 1,000+ prompts over staged imports. Do not generate fake usage counts, ratings or reviews. Seed prompts must have useful descriptions, clear instructions, appropriate language/category/tags, and safe output constraints. Begin with a smaller verified batch, then expand category by category.

## Delivery phases

1. Inspect existing app navigation, auth middleware, Mongoose conventions, test setup and deployment configuration.
2. Implement backend models, validation, public discovery endpoints and tests.
3. Implement moderation, favourites, collections, reports and admin endpoints.
4. Build the integrated SHIVASHA module using existing app auth and visual conventions.
5. Build the standalone website as a separately deployable frontend using the same API.
6. Add curated seed content, Hindi/English content, documentation and import tooling.
7. Run backend tests, frontend production builds, authorization checks, responsive/accessibility checks and deployment smoke tests.

## Acceptance criteria

- Both frontends show the same published catalogue and category tree from the shared API.
- A prompt approved once appears in both experiences without duplicate entry.
- Public users can browse and copy free prompts.
- Private actions require valid authentication.
- Admin moderation and premium restrictions are enforced server-side.
- Existing SHIVASHA login, social feed and API behavior remain intact.
- No secrets are committed; no payment or AI provider is assumed to be configured.
- The standalone frontend can be built and deployed independently.
- Documentation explains environment variables, local setup, seed import, deployment and rollback.
