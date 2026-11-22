# SHIVASHA Education & Affiliate Marketplace

## Decision

Build this as modules inside the existing SHIVASHA application and its existing React + Express + MongoDB stack. Do not create a separate app or a second user database. Reuse the current authentication, user profiles, content publishing, education resources, subscriptions, notifications and admin controls.

This plan borrows the useful parts of digital-education affiliate platforms (structured learning products, creator/partner referrals and learner communities) without copying another company's branding, course catalogue, commission promises or proprietary material.

## Product areas

1. **Learning Academy** — discover courses, lessons, articles, videos, practice resources and live learning events. Reuse the existing Content Studio and Edutech foundations; add course-specific enrollment and progress only after the commerce and access rules are ready.
2. **Affiliate Partner Centre** — optional, free partner enrollment; unique referral code/link; transparent click, enquiry and confirmed-sale reporting; downloadable campaign assets and policy.
3. **Creator & Instructor Centre** — instructor profile, course/content submissions, review status, learner feedback and creator earnings. Reuse existing Creator Earnings where possible rather than creating a duplicate ledger.
4. **Business & Freelancer Services** — list real services, receive customer enquiries, and connect qualified leads to the existing Business Suite/CRM.
5. **Community & Mentorship** — course discussions, events, announcements, moderation and learner support.

## Commercial rules and trust safeguards

- No mandatory joining fee, paid rank, downline purchase or recruitment-based reward.
- A referral is not a sale. Commission becomes eligible only after a real, recorded, paid transaction is verified under the published policy.
- No commission for self-purchases or fabricated, duplicate, cancelled, refunded or chargeback transactions.
- Refunds and chargebacks reverse the related pending commission according to the published terms.
- Show the commission rate, eligible product, attribution window, validation status, refund window and payout threshold before a partner shares a link.
- Never promise income, guaranteed leads, guaranteed job placement or guaranteed course outcomes.
- Keep referral attribution auditable and prevent users from changing the referrer after a valid attribution is locked, except through a documented support correction.
- Collect only necessary customer data. Obtain consent before marketing messages; provide opt-out and account/data deletion routes.
- Do not upload copyrighted books, videos or course material without permission. Label official, licensed, instructor-created and third-party resources distinctly.
- Have Indian legal, tax, consumer-protection, privacy and payment compliance reviewed before accepting payments or paying commissions.

## Revenue model

The module may support these independently switchable revenue streams, subject to a published price and policy:

- Course and learning-resource sales.
- Affiliate commission on eligible completed sales.
- Instructor/creator revenue share.
- Optional premium learning or business memberships.
- Business service leads and service commissions.
- Business tools / AI SaaS subscriptions.

A free learner account must remain possible. Membership must not be required to earn a referral commission unless a separately reviewed lawful product policy explicitly supports it; default policy is no paid entry barrier.

## Phase 1 — safe foundation (first implementation milestone)

- Audit and reuse existing User, Content, Education, Subscription, Creator Finance and Admin models/routes.
- Define a single referral attribution and commission ledger; do not duplicate creator earnings or subscriptions.
- Add partner opt-in, referral code/link generation, attribution capture and fraud/abuse checks.
- Add a partner dashboard with clicks, enquiries, pending validation, approved commission, reversed commission and paid amount. Distinguish tracked metrics from verified sales.
- Add admin review and an immutable audit trail for commission approval/reversal.
- Keep payout execution disabled until a payment provider, KYC, tax handling, refund rules and reconciliation are approved.
- Add automated tests for authorization, self-referral, duplicate events, attribution expiry, refund reversal and admin-only approvals.

**Phase 1 exit criteria:** a test user can opt in, share a referral link, generate a consented enquiry, and see accurate attribution; an admin can review a test conversion; no commission is paid or displayed as earned before the transaction is verified. All actions are authenticated, authorized, auditable and tested.

## Phase 2 — course commerce and learner journey

- Course detail pages with instructor, syllabus, language, duration, preview, price, refund policy and license information.
- Payment checkout and verified payment webhooks with idempotency.
- Enrollment, lesson access, progress, quizzes, completion certificates and learner support.
- Refund and chargeback processing linked to enrollment and commission reversal.
- Accessibility, age-appropriate content controls and guardian safeguards where children are involved.

## Implemented Phase 4 groundwork — checkout, refunds, reviews and payout preview

The branch adds provider-neutral course order records and learner order history; learner cancellation of unpaid orders; admin-only manual reconciliation after an independently confirmed payment; authenticated refund requests and admin refund confirmation after an external refund; enrolled-student course ratings/comments with moderation; and an admin preview of verified instructor balances plus approved affiliate commissions. Refunded/revoked enrollments no longer receive paid lesson URLs or certificate access, and cannot be used to create new instructor/affiliate sale ledger entries.

**Important limits:** checkout orders do not charge a card or UPI account. There is no gateway SDK, signed provider webhook, automatic payment verification, tax/KYC workflow, payout batch, bank detail storage or money transfer. Refund confirmation only records a refund that has already been executed outside SHIVASHA. Payout preview is informational only. The user selected to defer payment gateway selection.

## Phase 3 — creator and affiliate growth

- Instructor onboarding and content review workflow.
- Campaign links, approved promotional assets and disclosure reminders.
- Partner performance reports, conversion cohorts and export.
- Payout eligibility, KYC, tax documents and reconciled payouts after compliance approval.

## Phase 4 — marketplace integration

- Connect learning offers to Business Directory, Freelancers, Global Projects & Leads, E-commerce and CRM.
- Allow businesses to publish verified service offers and receive opt-in enquiries.
- Separate course commission, service commission, lead fees and subscription billing in reporting.

## Phase 5 — AI assistance and global readiness

- AI course discovery and learning recommendations grounded in published catalogue data.
- AI campaign copy assistance with clear affiliate disclosure and human approval.
- Fraud/risk signals with human review and appeal.
- Multi-language, multi-currency and country-specific legal/payment reviews before enabling each market.

## Existing code to reuse

- `src/ContentStudio.jsx` and `server/routes/content.js` / `server/models/Content.js` for learning content foundations.
- Existing Education House, question bank, student attempts and study-plan APIs for learner experiences.
- Existing `src/CreatorEarnings.jsx` and creator-finance API for creator ledger patterns; assess reuse before adding any new ledger.
- Existing Subscription module for optional membership, without conflating membership with affiliate eligibility.
- Existing authentication, admin authorization, notifications, CRM and business inquiry modules.

## Explicit non-goals for this milestone

- No copy of IDIGITALPRENEUR's brand, course content, pricing or terms.
- No pyramid / recruitment commission, guaranteed earnings or paid rank.
- No automatic payouts, payment gateway activation or public commission rates before legal and financial approval.
- No claim that this plan is already live. Runtime features require implementation, tests and deployment verification.
