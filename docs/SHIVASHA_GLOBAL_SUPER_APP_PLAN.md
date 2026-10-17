# Shivasha Global Technology Super App
## Master Product Plan — 12 Houses, 15 Modules, 7 Phases

**Company:** Shivasha Software Company  
**Flagship product:** Shivasha Global Technology Super App  
**Product principle:** The four Purusharthas — Dharma, Artha, Kaam and Moksh — are the app's top-level category/navigation framework. The 12 Jyotish houses are subcategories grouped under them. The 15 modules are product capabilities mapped into those houses. The 7 phases are the delivery roadmap. Software engineering, AI, security, and shared platform services power the entire ecosystem.

> The house taxonomy is a modern product organization inspired by traditional Jyotish house themes. It is not a claim that software features are traditional astrological rules.

## 1. Four Main Categories: Purusharthas

The top-level navigation is organized into four main categories. The 12 Jyotish houses remain as subcategories within these categories, using the traditional Purushartha grouping:

| Main category | Houses | Product organization |
|---|---|---|
| **Dharma (धर्म)** | 1, 5, 9 | Self & Identity; Education & Creativity; Knowledge & Philosophy |
| **Artha (अर्थ)** | 2, 6, 10 | Wealth & Finance; Services & Wellbeing; Career & Profession |
| **Kaam (काम)** | 3, 7, 11 | Skills & Communication; Business & Partnerships; Networks & Growth |
| **Moksh (मोक्ष)** | 4, 8, 12 | Home & Property; Research & Transformation; Inner Growth & Global Reach |

## 2. The 12 Houses

| House | Category | Primary purpose | Primary module mapping |
|---|---|---|---|
| 1 — First | Self & Identity | Digital identity, personal profiles, self-development | M1 Social |
| 2 — Second | Wealth & Finance | Commerce, financial tools, payment integrations | M4 Marketplace, M7 Payments, M12 Business OS |
| 3 — Third | Skills & Communication | Communication, developer tools, software creation | M9 Developers, M10 Software Solutions |
| 4 — Fourth | Home & Property | Property listings, home services, property tools | M6 Services |
| 5 — Fifth | Education & Creativity | Learning, creators, creative tools | M11 Edutech, M14 Creator Platform |
| 6 — Sixth | Services & Wellbeing | Local services, productivity, wellbeing resources | M6 Services |
| 7 — Seventh | Business & Partnerships | Business profiles, customer acquisition, B2B | M2 Business, M4 Marketplace |
| 8 — Eighth | Research & Transformation | AI, cloud integrations, security, risk tools | M3 AI, M8 Cloud |
| 9 — Ninth | Knowledge & Philosophy | Higher learning, philosophy, spirituality, culture | M11 Edutech, M13 Community |
| 10 — Tenth | Career & Profession | Jobs, professional growth, enterprise work | M5 Jobs, M10 Software Solutions, M12 Business OS |
| 11 — Eleventh | Networks & Growth | Communities, discovery, business growth | M13 Community, M15 Enterprise, M2 Business |
| 12 — Twelfth | Inner Growth & Global Reach | Reflection, multilingual communities, global collaboration | M13 Community, M3 AI, M15 Enterprise |

Modules can appear in more than one House when useful for discovery, but every module should have a documented primary House to avoid duplicated implementations.

## 3. The 15 Product Modules

1. **M1 — Shivasha Social:** profiles, feed, posts, follows, messaging, notifications, communities.
2. **M2 — Shivasha Business:** business registration, profiles, products/services, inquiries, leads, reviews, analytics.
3. **M3 — Shivasha AI:** assistant, natural-language search, recommendations, AI business discovery, workflow assistance.
4. **M4 — Shivasha Marketplace:** catalogue, seller tools, carts, orders, offers, returns.
5. **M5 — Shivasha Jobs:** jobs, candidate profiles, resumes, applications, freelance opportunities.
6. **M6 — Shivasha Services:** local service listings, provider discovery, bookings/inquiries and service support.
7. **M7 — Shivasha Payments:** authorized payment-gateway integration, payment status, refunds and reconciliation.
8. **M8 — Shivasha Cloud:** integrations for deployment, monitoring, logs, backups and CI/CD.
9. **M9 — Shivasha Developers:** developer portal, API docs, API keys, SDKs, webhooks and sandbox.
10. **M10 — Shivasha Software Solutions:** websites, web/mobile apps, custom software, API development and maintenance.
11. **M11 — Shivasha Edutech:** courses, lessons, quizzes, learning progress and training.
12. **M12 — Shivasha Business OS:** CRM, sales pipeline, invoices, inventory, team workflows and reports.
13. **M13 — Shivasha Community:** interest-based, educational and spiritual communities, events and moderation.
14. **M14 — Shivasha Creator Platform:** creator profiles, publishing, audience analytics and future monetization.
15. **M15 — Shivasha Enterprise:** organization accounts, access controls, audit logs, integrations and enterprise support.

## 4. Seven Development Phases

### Phase 1 — Foundation
- Audit the current codebase and preserve existing working features.
- Validate authentication, authorization, API configuration, database connectivity and deployment.
- Establish responsive 12-House navigation and shared UI conventions.
- Add baseline tests, logging, backups, secret handling and error states.

**Exit criteria:** critical user journeys are tested; frontend/backend connectivity is documented; deployment and rollback steps are known.

### Phase 2 — Business Super App
- Business profile and onboarding.
- Product/service listings and search.
- Customer inquiries, messaging and lead tracking.
- Admin moderation and abuse reporting.

**Exit criteria:** a business can publish a profile/listing and a customer can discover it and send an inquiry end to end.

### Phase 3 — AI Super App
- AI assistant and natural-language search.
- Business discovery grounded in available listings.
- Recommendations with clear explanations and privacy controls.
- Cost limits, safety checks, observability and human confirmation for consequential actions.

**Exit criteria:** AI results are grounded in stored/available data, failures are handled, and usage/cost can be monitored.

### Phase 4 — Marketplace & Careers
- Jobs and professional profiles.
- Service listings and inquiry/booking workflow.
- Marketplace orders and seller tools.
- Payment-gateway integration only after the commerce flow and legal requirements are reviewed.

**Exit criteria:** order/job/service journeys have authorization, validation, auditability and end-to-end tests.

### Phase 5 — Developer Platform
- API documentation and versioning.
- Scoped API credentials and rotation/revocation.
- Webhooks, usage limits, sandbox and SDKs.
- Developer support and change policy.

**Exit criteria:** a test developer can authenticate, use a documented API in a sandbox and inspect usage/errors.

### Phase 6 — AI Agents & Business OS
- CRM, sales pipeline and business analytics.
- Workflow automation with narrowly scoped permissions.
- Human approval for sensitive/external actions.
- Audit trails, retries, idempotency and failure recovery.

**Exit criteria:** each automation has permissions, logs, an approval model and a tested recovery path.

### Phase 7 — Global Expansion
- Internationalization and accessible UI.
- Language and region-aware discovery.
- Regional provider integrations and localization.
- Country-by-country privacy, consumer, payments and data-retention review.
- Load testing, disaster recovery and support readiness.

**Exit criteria:** a specific target market has a documented compliance review, operational support plan and measurable launch criteria.

## 5. Shared technical foundation

The current repository uses React/Vite on the frontend and Node.js/Express with MongoDB/Mongoose on the API. Prefer a **modular monolith** initially: separate modules by domain without prematurely splitting into microservices.

Shared platform capabilities:
- Authentication and role-based authorization.
- User/business identity and profile management.
- Search and discovery.
- Messaging and notifications.
- Media/object storage.
- Audit logging, rate limits and abuse controls.
- Central error reporting, backups and monitoring.
- API contracts, tests and CI/CD.
- Data export/deletion and privacy controls.

Potential later integrations (AI providers, payment gateways, cloud services) should be provider-agnostic where practical. Never commit secrets or place private API keys in frontend code.

## 6. Recommended implementation order

1. Audit repository and deployed environment; record current behavior and known gaps.
2. Implement and test the 12-House navigation shell (current first UI milestone).
3. Complete Phase 1 stability/security work.
4. Build Phase 2 business profiles, listings and inquiries end to end.
5. Add AI discovery after useful, moderated business data exists.
6. Expand to commerce, jobs and services.
7. Open developer APIs only after authentication, rate limits, versioning and observability are ready.
8. Expand globally only with real usage evidence and market-specific reviews.

## 7. Product metrics

- **Consumer:** active users, retention, successful sign-ups, meaningful conversations, abuse/report rate.
- **Business:** active profiles, listing completeness, inquiries, response rate, qualified leads and lead conversion.
- **Technical:** API error rate, latency, availability, failed deploys, recovery time and security incidents.
- **Financial:** paying business retention, revenue, support/hosting cost, gross margin and acquisition cost.

Set numeric targets only after collecting a reliable baseline.

## 7. Current implementation status

The 12-House Explorer is a **navigation/product-mapping foundation**. The cards describe planned capabilities and roadmap mappings; they do not imply that every listed service is already implemented, connected to a backend, or enabled in production.

The current social application should remain intact while the new framework is added incrementally. Use a feature branch and pull request for review before merging changes into the live deployment.


## 8. Unified Content Platform (new prototype milestone)

The Content Studio UI provides a shared discovery surface for these planned formats:
- Long-form video
- Vertical short video / Reels
- Articles
- Images and galleries
- Courses and lessons
- Live events and streaming
- Business product/service videos linked to inquiries

The current UI is a **front-end prototype with clearly labelled example cards**. Its type tabs, text search and 12-House filter work locally in the browser. Example cards are not published user content, and the prototype does not yet upload or persist media, play hosted videos, enroll learners, track course progress, host live streams, or create business leads.

### Implementation sequence to production
1. Define a shared content model and authenticated API with House, creator, format, status, visibility, tags and media metadata.
2. Add secure media storage/video hosting with upload validation, size/type limits, processing state and signed/private access where needed.
3. Build creator publishing workflow: draft, preview, thumbnail, captions, alt text, moderation status and publish/unpublish.
4. Implement format-specific experiences: video player and playlists, vertical feed, article reader, image galleries, course lessons/progress, live provider integration, and business inquiry actions.
5. Add reporting/moderation, quotas, accessibility, analytics, retention/deletion controls and end-to-end tests.

Do not describe this prototype as a working video hosting, course or live-streaming service until the corresponding backend and provider flows are implemented and tested.
