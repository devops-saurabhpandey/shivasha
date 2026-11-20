# Shivasha Global AI Marketplace — Product Foundation

**Status:** Approved product direction; implementation is phased.  
**Product:** Existing Shivasha app (this is not a separate app).  
**Audience:** Consumers, businesses, service providers, freelancers, educators, suppliers and partners worldwide.

## Product vision

Shivasha Global AI Marketplace helps a person or business describe a need in natural language and discover suitable, relevant and verifiable services, providers, projects, products and learning resources. It combines business discovery, service listings, qualified inquiries and AI-assisted matching in the existing Shivasha ecosystem.

**Positioning:** One Platform. Every Business. Global Opportunities.

The marketplace must provide useful free discovery before introducing paid visibility or transaction fees. AI recommendations must be grounded in actual listing data and clearly explain why a provider is suggested. No provider is described as verified unless the verification workflow has actually completed.

## 1. Eight marketplace departments

1. **AI Services** — AI agents, workflow automation, customer support, analytics and AI implementation services.
2. **Web & Software** — websites, mobile apps, CRM, ERP, integrations, maintenance and custom software.
3. **Global Projects** — project briefs, tenders/opportunities where legally redistributable, client requests, proposals and project matching.
4. **Business Directory** — searchable company profiles, locations, industries, capabilities, contact preferences and business inquiries.
5. **Freelancers & Experts** — professional profiles, portfolios, skills, availability, service packages and proposals.
6. **Education & Skill Development** — courses, tutoring, training providers, books/resources from lawful sources and skills discovery.
7. **Finance & Insurance** — educational comparisons and referrals for eligible providers; regulated advice, underwriting and product sales remain with appropriately licensed entities.
8. **E-commerce & Suppliers** — product catalogues, supplier discovery, wholesale inquiries and links to authorized checkout/commerce providers.

Each department uses shared identity, search, listing, inquiry, moderation, notification and analytics services. Department-specific fields and workflows should be modular rather than duplicated.

## 2. Six revenue streams

1. **Lead Generation** — disclosed fees for qualified, consented inquiries delivered to providers.
2. **Service Commission** — a clearly disclosed platform fee on eligible transactions completed through supported marketplace workflows.
3. **Premium Business Membership** — optional subscription for enhanced tools, analytics, additional listings or team features. Basic discovery/listing access should remain available under the approved free tier.
4. **AI SaaS Subscription** — paid business tools such as AI sales assistance, customer support, content assistance and workflow automation, with usage limits and transparent pricing.
5. **Affiliate Revenue** — disclosed referral commissions for eligible third-party software, hosting, education and products. Recommendations must not be ranked solely by commission.
6. **Advertising Revenue** — clearly labelled sponsored placements with controls to prevent misleading endorsements or interference with organic relevance.

Revenue events must be auditable. Track gross transaction value, platform revenue, refunds, chargebacks, taxes and provider payouts separately. Do not describe gross sales or marketplace volume as Shivasha revenue or profit.

## 3. Five delivery phases

### Phase 1 — Global AI Services Marketplace MVP
- Launch a focused set of service categories: AI automation, website/app development, software, digital marketing and design.
- Support customer and provider profiles, service listings, search, inquiry forms, provider response and admin moderation.
- Keep basic provider listings free initially.
- Add consent records, spam/rate controls, reporting and a simple lead-management workflow.
- Measure whether real customers submit inquiries and providers respond.

**Exit criteria:** A customer can discover a listing, submit a consented inquiry, and the provider can respond; an administrator can review/report/remove abusive content. Core journeys have automated tests.

### Phase 2 — Global Business Discovery
- Expand to all eight departments.
- Add country, region, language, currency display, industry and capability filters.
- Add business profiles, supplier/freelancer profiles and structured listing quality checks.
- Add provider verification states with documented evidence and expiry/review rules.
- Support saved searches and notification preferences.

**Exit criteria:** Each department has a defined listing schema, usable filters, moderation rules and tested inquiry flow.

### Phase 3 — AI Matching Engine
- Accept natural-language needs and ask clarifying questions when essential details are missing.
- Match only against available, eligible listings and explain the match factors.
- Rank by relevance, location/service coverage, capability, response history and user preferences; sponsored status must be labelled and must not silently override relevance.
- Give users control over sharing their inquiry with providers.
- Add human review/escalation, abuse safeguards, evaluation datasets, cost limits and monitoring.

**Exit criteria:** AI outputs are grounded in retrieved records, include understandable reasons, respect access controls and consent, and have quality/safety tests and fallback behavior.

### Phase 4 — Global Transactions
- Add quote/proposal comparison, milestones, order states, invoices/receipts and dispute workflows.
- Integrate a payment provider only after country, tax, KYC/AML, consumer-protection, refund and marketplace liability reviews.
- Use idempotent payment webhooks, immutable financial ledgers, role-based access and audit logs.
- Define provider payout, cancellation, refund and chargeback policies.

**Exit criteria:** A complete test transaction, refund and dispute journey passes in a supported test environment; reconciliation and security reviews are complete.

### Phase 5 — International Expansion
- Add reviewed translations, locale-aware formats and regional discovery.
- Launch country by country based on provider supply, demand, support readiness and legal review.
- Review privacy, data residency/transfer, consumer, advertising, tax, payments, accessibility and sector-specific rules in each target market.
- Add operational monitoring, backups, incident response, support and disaster-recovery exercises.

**Exit criteria:** Every launched market has named operational ownership, supported payment/referral methods, documented compliance review and measurable product/quality baselines.

## 4. Core user journeys

### Customer
1. Choose a department or describe a need.
2. Add location/market, budget, timeline and required capabilities where relevant.
3. Review relevant listings and transparent match explanations.
4. Choose which provider(s) may receive the inquiry.
5. Track replies, compare proposals and optionally transact when supported.

### Provider
1. Create a personal or business profile.
2. Select departments, service areas, languages and capabilities.
3. Publish listings and supply evidence for any verification badge requested.
4. Receive only inquiries permitted by the customer's sharing choices.
5. Respond, manage opportunities and review performance.

### Administrator / moderator
1. Review reports, suspicious listings and verification evidence.
2. Apply documented moderation decisions with an audit trail.
3. Manage categories, sponsored placements and provider restrictions.
4. Review lead quality, complaints, fraud signals and marketplace health.

## 5. Initial data model

Use the existing Shivasha authentication and database conventions. Add domain models only after inspecting current models and indexes; avoid duplicate user/business identities.

- **BusinessProfile:** owner, legal/display name, description, industry, country/region, languages, public contact settings, status.
- **ProviderProfile:** owner, provider type, skills, service areas, portfolio references, availability, verification state.
- **ServiceListing:** provider, department, title, description, category, pricing mode/range, currency, delivery region, status, media references.
- **ProjectBrief:** requester, department, requirements, budget range, currency, timeline, location/market, visibility and status.
- **Inquiry/Lead:** requester, listing/provider, brief, consented recipients, source, status, timestamps and audit events.
- **Proposal/Quote:** provider, inquiry, scope, price/currency, milestones, validity and status.
- **Membership/Subscription:** account, plan, entitlements, billing-provider references, state and renewal dates.
- **RevenueLedgerEntry:** event type, gross amount, platform fee, provider amount, currency, refund/chargeback references and reconciliation state.
- **AffiliateOffer:** merchant, offer, disclosure text, destination, eligibility, commission metadata and review state.
- **SponsoredPlacement:** advertiser, campaign, placement, targeting rules, spend cap, dates, disclosure and moderation status.
- **VerificationReview:** subject, evidence references, reviewer, decision, reason, expiry and audit history.
- **Report/ModerationAction:** reporter, target, category, evidence, action, reviewer and timestamps.

Use stable IDs, indexes for search/filter fields, tenant/owner authorization, input validation, retention rules and data export/deletion workflows. Do not store payment-card data; use a compliant payment provider's tokenized references.

## 6. Trust, safety, privacy and compliance

- Obtain explicit consent before forwarding a customer's contact details or brief to a provider.
- Collect only necessary personal data; provide privacy notices, export and deletion paths.
- Keep secrets and provider API keys server-side; never embed private credentials in the frontend.
- Enforce server-side authorization for every read/write, not only UI visibility.
- Add rate limits, bot/spam controls, file validation, safe uploads, reporting and appeals.
- Label paid placements, affiliate links and commercial relationships clearly.
- Never sell fake reviews, fabricate provider verification or guarantee outcomes.
- Finance/insurance content must be informational unless a properly licensed partner is responsible for regulated activity.
- Education resources must respect copyright and link to authorized sources.
- Define country-specific terms, taxes, consumer rights, data transfers and payment requirements before enabling a market.

## 7. Success metrics

Start with measured baselines rather than unsupported growth promises:
- Customer: search-to-inquiry conversion, time to first useful result, repeat use and complaint rate.
- Provider: active verified listings, inquiry response rate, qualified lead rate and provider retention.
- Marketplace: successful matches, proposal rate, transaction completion and dispute/refund rate.
- Financial: net platform revenue, refunds, chargebacks, payment fees, acquisition cost, support cost and contribution margin.
- Trust/operations: moderation response time, fraud reports, privacy requests, API availability and incident recovery.

## 8. Implementation guardrails

- Keep this inside the existing Shivasha app and shared backend; do not create a separate marketplace app.
- Preserve the existing social, education, spiritual, business and other working modules.
- Prefer a modular monolith and shared platform services until measured scale justifies service separation.
- Build in feature branches and reviewable pull requests; do not commit directly to the production branch.
- Never merge or deploy automatically as part of this planning change.
- A roadmap item is not a shipped feature. Mark each feature as planned, in progress, tested or live based on evidence.
- Phase 1 is the immediate implementation target; later phases remain in the roadmap until their exit criteria are met.
