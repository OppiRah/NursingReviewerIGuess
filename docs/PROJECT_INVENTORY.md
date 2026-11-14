# Existing Projects — Starting Inventory (not a code audit)

**Evidence status:** Owner-provided descriptions and prior conversation, **not independently inspected here**. Before claiming a reusable component, Claude Code must inspect authorized repository files and test results. Never claim production readiness because a historical test count was reported.

| Project | Reported implementation | Potential reuse | Likely blockers / unknowns |
|---|---|---|---|
| Portfolio | Custom interactive, responsive developer website; Astro/TypeScript/CSS | UI content architecture, accessibility patterns, deployment process | Portfolio builder is a different multi-user product; identity/content model, isolation, customer demand |
| QA workflows (cross-project) | Regression automation, release gates, browser tests | Experience with verification contracts, CI output normalization and test design | No dedicated SaaS codebase; integrations, data modeling, product support |
| BuildTrack | Astro static business site, inquiry/email-related workflow | Domain knowledge, inquiry forms, front-end artifacts | Not contractor ERP; workflow correctness, customer approvals, data access, ownership |
| ShortsLab | Python media pipeline with tests and partial desktop direction | Media processing, editorial exports, validation | Copyright/licensing, compute cost, quality benchmarks, distribution, API rules |
| CALSS | C++ GUI source-code comparison and instructor review elements | Similarity pipeline concepts, presentation and audit patterns | Collaborative thesis IP, false positives, privacy, ownership, deployment scaling |
| Jairus | Python desktop voice assistant with wake word, local STT, automation, Android gateway | Tool isolation, permission boundaries, speech pipeline | Reliability, security, hardware dependency, UX, platform permission constraints |
| Notification Bridge | Windows–Android pairing, overlay UI, secured communication | Event routing, pairing, overlay rendering | Android OEM restrictions, maintenance burden, ongoing compatibility |

## Ownership (owner-stated 2026-11-09)

- **BuildTrack, ShortsLab, Jairus, Notification Bridge:** solely owned.
- **CALSS:** not solely owned; its code is not reusable commercially without co-owner agreement. Category E continues as a problem area only.
- **Capstone (procurement/inventory):** excluded from scope by owner decision.
- **Portfolio, QA workflows:** ownership not stated in the owner's 2026-11-09 statement.

## Repository examination checklist (only with owner access)

- [ ] Identify repository location, branch, clean/dirty state and owner-approved scope.
- [ ] Check license, NOTICE files, copied assets, collaborators and distribution rights.
- [ ] Record exact commit hash and whether it was pushed.
- [ ] Inspect architecture documentation and build/test instructions.
- [ ] Execute nothing without an approved task and safe environment.
- [ ] Distinguish tested behavior from claims based on README or old logs.
- [ ] Make a **component-level** reuse assessment; do not assume an entire project can be repurposed.
- [ ] Identify hidden dependencies, secrets, local machine assumptions and platform-specific APIs.
- [ ] Flag data classification: source code, submitted coursework, customer details, media, auth credentials.
- [ ] Record who may lawfully authorize commercialization or publication.

## Stage limitation

The discovery folder is independent from these codebases. Claude Code may not traverse unrelated project directories or modify those repositories without explicit owner permission.
