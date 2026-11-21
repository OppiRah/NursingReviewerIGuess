# STATUS — read first, update last (≤60 lines)
Last updated: 2026-11-16 · **Product: H (D-008)** · **BUILD-001–006 committed (b7355c8); AUDIT-001 + FIX-001 + BETA-PREP done (D-014), v0.2.0 staged, not committed, not deployed**
Repo: github.com/OppiRah/NursingReviewerIGuess (public). Interview notes are local-only in research/interviews/notes/ (gitignored).
Git rule: ask the owner before every commit/push (explicit "yes"); no AI attribution. See ../CLAUDE.md "Git policy".

## Owner constraints
- ~7–10 hrs/week (strategist estimate); cheap hosting + domain only; no fixed deadline
- Goals: portfolio value and commercial potential weighted equally
- Solely owned: BuildTrack, ShortsLab, Jairus, Notification Bridge. CALSS co-owned (problem area only). Capstone excluded.

## Product H (selected, D-008)
- Nursing student reviewer: own reviewers → daily active-recall plan to exam date; school exams first, PNLE later
- Spec: product/PRODUCT_SPEC.md · Validation: ≥3 of 5 friends use it on ≥3 days in the week before a school exam, unprompted
- Key risks: medical-content accuracy; copyright of review-center material; privacy; iOS storage
- Mascot: app uses an original placeholder SVG; v0 concept image (AI-generated) is NOT used

## Platform and stack
- ADR-001 (D-010): PWA now, Capacitor later; reminders = calendar .ics; export mandatory
- ADR-002 (adopted, D-011): Vite + React + TS strict; Dexie/IndexedDB; FSRS-6 via ts-fsrs behind `Scheduler`; one plain-text import format + BYO-AI prompt
- SPIKE-001 7-day device test skipped; owner accepted the risk (D-011)

## Build state (app/, 2026-11-14 overnight run)
- BUILD-001: import (paste/.txt, line-numbered preview), Today, sessions with rationale, FSRS, backup export/import/wipe, .ics reminder, PWA + strict CSP
- BUILD-002: SATA, priority, flashcards; readiness (estimated); mistakes mode; deck screen (search/edit/delete/report wrong); schema v2 + migration
- BUILD-003: onboarding, mascot moments, gentle streak, dark mode, 360px/44px, axe + keyboard-only E2E
- BUILD-004: security tests, 2 MB limit, hostile-backup validation, 1,000-item timing, ARCHITECTURE.md, app/README.md
- BUILD-005 (2026-11-16): on-device PDF/DOCX upload (pdfjs-dist, mammoth; lazy), paste normalization + merged-block recovery (real PDF text: 0 → 200 items), Android back button; gates 182 unit / 29 E2E
- BUILD-006 (2026-11-16): BYO-AI path made robust (fences, bold, Q-forms, small talk), notes card with Copy prompt, DOCX zip-bomb guard, scanned vs unreadable PDFs, history after reload; gates 233 unit / 33 E2E; audit NOT RUN (network)
- AUDIT-001 (2026-11-16, Fable): product/AUDIT-001.md, frozen (hash in BUILD_LOG). Verdict: GO with must-fix list (0 critical, 3 high)
- FIX-001: A-01–A-04, A-07, A-09 fixed; A-05, A-06, A-08 partly (open); A-10–A-20 Low, listed. Gates 267 unit / 39 E2E; audit 0 vulnerabilities
- BETA-PREP: v0.2.0, version + Copy feedback info in Settings, tap-to-update banner, product/BETA_GUIDE.md, product/BETA_TEST_PLAN.md
- Gates: see product/BUILD_LOG.md (final report at the end)

## Next actions
1. Owner: review BUILD_LOG "FIX-001" (decisions made alone) + commit/push (agents can't commit: denied in settings)
2. Owner: `npm run build`, drag app/dist to Netlify Drop; do the 10 phone checks in product/BETA_TEST_PLAN.md stage 0
3. Then: 1 friend for 3 days (send product/BETA_GUIDE.md), then up to 5 friends for an exam week; measure the D-008 rule
4. Later: A-05/A-06/A-08 and Low findings; product name; mascot redraw; v0.2 sharing (ADR needed)

## Open questions
- Do NotebookLM/Knowt plan review backward from an exam date? (check in current apps)
- iOS home-screen storage persistence and .ics alarm reliability: UNKNOWN until real-device test
- PDF import on real phones (speed, iOS legacy pdf.js) and other PDF layouts: UNKNOWN

## Key files
- Paths below are relative to docs/
- Decisions: decisions/DECISION_LOG.md (D-000..D-014)
- Product: product/PRODUCT_SPEC.md, product/ADR-001-platform.md, product/ADR-002-stack-scheduler-import.md, product/ARCHITECTURE.md, product/BUILD_LOG.md, product/AUDIT-001.md, product/BETA_GUIDE.md, product/BETA_TEST_PLAN.md
- App: ../app/README.md (run, test, build, deploy, BYO-AI flow)
- Evidence: research/SOURCE_REGISTER.md (grep S-ID), research/EVIDENCE_LEDGER.md (grep C-/H-ID)
