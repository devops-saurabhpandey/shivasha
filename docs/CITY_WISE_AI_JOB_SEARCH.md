# SHIVASHA City-Wise AI Job Search

## Scope
This feature combines (1) SHIVASHA-hosted company listings and (2) external job-source links. Search is city-first and supports All India, remote/hybrid/on-site, role, skills, qualification, experience, and salary filters.

## User experience
- Search by role/skills and city (e.g. Python Developer, Kanpur).
- Filters: fresher/experience, qualification, work mode, salary range, job type.
- Result cards show title, company, city, work mode, salary (when provided), source, posted date, and apply link.
- AI match score is labelled as an estimate and explains matching skills; never guarantees selection.
- Save jobs and track applications after authentication.
- Recruiter workspace: company profile, create/edit/close listing, and view applications.

## Data sources
1. **SHIVASHA listings:** stored in MongoDB and managed by verified recruiter accounts; publish/moderation status is required.
2. **External listings:** integrate only through permitted APIs/feeds or approved links. Store source name, canonical URL, retrieval timestamp, and expiry; deduplicate by source + external ID/canonical URL. Do not scrape sites that prohibit it.
3. Do not display fabricated live vacancies. Seed/demo records must be clearly marked as samples.

## Suggested MongoDB collections
- `jobs`: title, description, companyId, city, state, country, skills[], qualification[], experienceMin, experienceMax, workMode, employmentType, salaryMin, salaryMax, currency, sourceType, sourceName, sourceJobId, applyUrl, status, postedAt, expiresAt, createdAt, updatedAt.
- `companies`: name, website, logo, verificationStatus, ownerUserId.
- `jobApplications`: jobId, applicantUserId, resumeUrl, answers, status, createdAt.
- `savedJobs`: userId, jobId, createdAt.
- `jobSearchEvents`: aggregate search analytics; avoid storing unnecessary precise location or sensitive data.

## API contract (proposed)
- `GET /api/jobs?query=&city=&state=&workMode=&experience=&qualification=&salaryMin=&salaryMax=&page=`
- `GET /api/jobs/:id`
- `POST /api/jobs` (verified recruiter)
- `PATCH /api/jobs/:id` (owner/admin)
- `POST /api/jobs/:id/applications` (authenticated candidate)
- `GET /api/jobs/me/applications` (candidate)
- `POST /api/jobs/:id/save` / `GET /api/jobs/me/saved`
- `GET /api/jobs/external-search?query=&city=` (server-side approved provider adapter; API keys stay in environment variables)

## AI matching
Start with transparent deterministic matching (skills, title, experience, qualification, city/work mode). Return a score plus matched/missing skills. Add an LLM provider later behind a server-side adapter and environment variable; do not send passwords, private messages, or unnecessary personal data to the model.

## Security and quality
- Validate and normalize all filters; paginate and cap page size.
- Require authentication for applications/saved jobs and recruiter actions.
- Verify recruiter/company ownership; moderate listings; rate-limit search and posting.
- Validate external URLs and reject unsafe schemes.
- Keep provider secrets in Render environment variables, never in frontend code.
- Tests: city filtering, remote jobs, salary bounds, pagination, authorization, duplicate external listings, expired jobs, and empty results.

## Delivery sequence
1. Job-search UI and local/API search contract.
2. MongoDB model + public search/detail routes.
3. Recruiter posting and moderation.
4. Candidate apply/save/application tracking.
5. Approved external provider adapter.
6. AI match explanations, tests, accessibility, and deployment verification.
