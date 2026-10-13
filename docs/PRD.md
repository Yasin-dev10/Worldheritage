# Product Requirements Document

**Status:** Phase 1 foundation reviewed; product requirements remain the baseline for implementation review  
**Product owner:** Founder  
**Initial content languages:** Somali (`so`) and English (`en`)

## 1. Product summary

Current code status is tracked in [the roadmap](ROADMAP.md). The product requirements below describe the intended platform; they do not imply that all listed workflows or domain types are implemented.

WorldHeritage is a multilingual learning and reference platform for exploring the histories of countries, historical periods and events, people, places, civilizations, cultures, religions, documents, and educational resources. It should make the evidence behind historical claims visible, communicate uncertainty honestly, and support accountable editorial review.

The founder owns product direction and platform operations. Ownership does not replace transparent sourcing, editorial independence, corrections, and review safeguards.

## 2. Problem and users

Historical learning material is fragmented across languages and formats; readers may not be able to assess provenance, disagreement, or date confidence. WorldHeritage aims to connect readable narratives to reviewed claims, sources, translations, and related entities.

Initial user groups:

- **Public reader:** discovers and reads published material without an account where possible.
- **Teacher:** finds material suitable for learning and classroom use.
- **Historian/researcher:** contributes sourced material and scholarly context.
- **Reviewer:** checks evidence, framing, rights, and editorial quality.
- **Country editor:** coordinates coverage and editorial workflow for an assigned country or countries.
- **Super admin:** manages platform configuration and privileged access.

## 3. Product principles

1. A material historical claim has one or more traceable sources or an explicit explanation of why evidence is unavailable.
2. Verified evidence, scholarly interpretation, disputed claims, and unknowns are visibly distinguished.
3. Somali and English are first-class locales; translations are authored/reviewed separately and are not presumed equivalent just because one exists.
4. Historical date precision and calendar context are explicit; unknown dates are not converted into falsely precise dates.
5. Accessibility, privacy, security, and rights clearance are requirements, not post-launch polish.
6. Human editorial approval is required before public publication.

## 4. Phase 1 scope

Phase 1 delivers this product and technical foundation: requirements, architecture, initial domain model, API contract, content policy, setup/security conventions, and a sequenced roadmap. No production application, historical corpus, AI assistant, mobile client, or media storage integration is delivered in this phase.

## 5. Initial functional requirements (for implementation phases)

- **Discovery:** browse and search published, locale-appropriate countries, periods, events, people, places, and civilizations; follow relationships among them.
- **Reading:** show a clear content status, author/editor attribution where appropriate, last reviewed/updated time, linked sources, date precision, and uncertainty/dispute notes.
- **Localization:** select Somali or English; provide a clear fallback indication when a translation is unavailable. Do not silently present machine translations as reviewed translations.
- **Contribution:** authenticated eligible contributors create and revise drafts, provide sources, and submit revisions for review.
- **Review:** reviewers request changes, reject, or approve a specific revision with a recorded rationale; separation of author and approver is preferred.
- **Administration:** privileged account, role, and workflow actions require server-side authorization and audit records.
- **Corrections:** readers can report an issue; editors can triage it and preserve a correction history.
- **Accessibility:** target WCAG 2.2 AA for user-facing web experiences, including keyboard operation, semantic structure, contrast, and screen-reader labels.

## 6. Non-functional requirements

- TypeScript web and Node.js/NestJS API; PostgreSQL as the relational source of truth.
- REST API with versioned routes, input validation, stable error shape, pagination, and documented authorization.
- Use UTC for system timestamps and explicit precision/calendar representation for historical dates.
- Secure-by-default authentication, least privilege, auditability, backups, and operational monitoring before public launch.
- Responsive web experience and progressive enhancement where practical; mobile Flutter is later work.
- Avoid premature service decomposition and unnecessary dependencies.

## 7. Success measures (to baseline before launch)

- All public historical entries meet the source and review requirements in the Content Policy.
- Somali and English coverage and translation-review status can be measured independently.
- Editorial queue age, review turnaround, correction resolution, and source completeness are measurable.
- Accessibility and security checks have defined owners and release gates.

Baselines, targets, analytics consent/retention, and privacy requirements need product-owner review before instrumentation is selected.

## 8. Out of scope until later phases

Flutter app; RAG/AI assistant; automated historical authoring; S3-compatible media delivery; social features; paid plans; broad third-party integrations; bulk import/scraping; and multi-service deployment. These require separate requirements, safeguards, and approval.

## 9. Open product questions

- Which legal entity, jurisdiction, privacy regime, and minimum age apply?
- Is public reading anonymous, and which contribution actions require accounts?
- What editorial independence and conflict-of-interest rules govern founder or sponsor involvement?
- What launch content scope and reviewer qualifications are required per locale and region?
- What retention, correction appeal, and takedown processes apply?
