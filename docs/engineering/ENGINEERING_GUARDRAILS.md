# Engineering Guardrails — For Later, Not Permission to Build

No architecture is selected until a customer/problem and distribution model are approved. This document defines **questions and boundaries** rather than a premature tech stack.

## First architectural question

Does solving the problem actually require multi-tenant SaaS? Consider, in order: manual service/prototype; offline/desktop; single-tenant/self-hosted; server-rendered web app; multi-tenant hosted app. Choose the least operationally costly model that satisfies observed needs.

## Security / privacy baseline

- Data classification; who owns it; purpose; retention and deletion; consent and user transparency.
- AuthN/AuthZ only where required; server-side authorization for every resource; never trust client-supplied tenant IDs.
- For multi-tenant, define tenant-scoped records, database constraints, authorization checks and isolation tests. Cross-tenant leakage is a critical failure.
- Secrets exclusively in secret managers/environment, never docs/logs/commits; rotate compromised credentials.
- Input validation, size limits, content type checking, output encoding, rate limiting, abuse/spam controls and dependency pinning.
- Backups/restore tests, incident response basics, audit logging where risk demands it, data export and deletion.
- Threat model external integrations and OAuth tokens; use minimal scopes and revocation paths.
- Do not send student source code, client details, voice/audio or creator-owned media to third-party AI services without explicit informed permission and documented legal basis.

## Product-specific red flags

**Portfolio:** Identity impersonation, OAuth token storage, untrusted repo Markdown/HTML, claims fabricated by LLMs, GitHub API rate limits.  
**QA:** CI secrets and logs, code access, false release-confidence claims, supply-chain integrations.  
**Contractor:** Personal customer details, financial documents, quote approval disputes, local compliance, messaging platform policies.  
**ShortsLab:** Copyright/licensing, takedown process, copyrighted data retention, GPU egress and processing cost, no unauthorized mass downloads.  
**CALSS:** Educational records, role-based instructor access, explainability, contestability, preservation of evidence, contributor rights and university policies.  
**Jairus:** Tool command allowlists, local privilege boundaries, confirmation for destructive actions, unauthenticated device access, voice spoofing.  
**Notification:** Android notification permissions, private messages, pairing keys, OEM reliability, opt-in filters, foreground/background limitations.

## MVP architecture review checklist

- Domain/data model and trust boundaries
- Explicit nonfunctional needs: latency, availability, offline behavior, recovery
- Chosen hosting/deployment model and realistic monthly cost range *based on measured workload*
- Auth/permission and data lifecycle (if any)
- Core UX, keyboard navigation and accessibility
- Integration contracts, failure modes and rate limits
- Automated test pyramid and release checks
- Logging without personal data, monitoring/alerts and rollback
- Data export and deletion; avoid vendor lock-in where possible
- One developer's maintainability and documentation

## Avoid by default

Microservices, Kubernetes, event buses, custom auth, agent swarms, proprietary AI dependence, premature payment integration, broad permissions and elaborate multi-agent pipelines. Require a specific technical need and tradeoff analysis for any exception.

## V3 — Testing, CI and verification choices

When implementing a **selected and authorized** product, require a short, architecture-specific test strategy covering static checks, unit/domain logic, integration boundaries, a few critical end-to-end journeys, security/privacy threats, and performance only where justified by an explicit budget. CI runs with least privilege and locked dependencies; no production secrets or deployment on untrusted pull requests. A green CI build never grants implicit approval to deploy. See `TEST_STRATEGY_AND_CI_CD.md` and `VERIFICATION_AND_RELEASE_GATE.md`. During product research, only documentation/source verification applies.
