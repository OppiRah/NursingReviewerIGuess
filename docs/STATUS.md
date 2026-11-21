# STATUS — read first, update last (≤60 lines)
Last updated: 2026-11-21 · **Product: H (D-008)** · **v0.2.0 pushed (c695263); v0.2.1 (HARDEN-021: A-05/A-06/A-08 + version bump) staged, NOT committed; not deployed**
New strategist? Read `HANDOFF_FOR_STRATEGIST.md` first (written 2026-11-21).
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
- FIX-001: A-01–A-04, A-07, A-09 fixed; A-10–A-20 Low, listed. Independent re-check 2026-11-21: A-01, A-02 resolved; A-03 desktop Chromium only
- HARDEN-021 (2026-11-21): A-08 backup counts only after "Yes, I found the file" (+ optional share sheet); A-05 weakest-recall-first, new items in every session, "About N sessions today" + per-deck outlook; A-06 readiness: unseen and last-wrong items = 0, one hint on all screens. Quota itself unchanged
- BETA-PREP: v0.2.0, version + Copy feedback info in Settings, tap-to-update banner, product/BETA_GUIDE.md, product/BETA_TEST_PLAN.md
- Gates (v0.2.1, 2026-11-21): typecheck PASS, unit 305/305, E2E 42/42, build PASS (bundle says 0.2.1), audit E2E 2/2; test:audit 12/19 (same 7 known non-sprint failures). Details: product/BUILD_LOG.md end
- 2026-11-21 docs sync: CLAUDE.md, PRODUCT_SPEC, ADR-001 headers aligned with D-008–D-011 (no decision change)

## Next actions
1. Owner: approve commit + push of staged v0.2.1 (decisions approved 2026-11-21: mixing, >10/day heuristic, last-wrong = 0, bump)
2. Owner: `npm run build`, drag app/dist to Netlify Drop; do the phone checks in product/BETA_TEST_PLAN.md stage 0 (incl. export → find file → confirm; share sheet). Real-phone test is still the release gate
3. Then: 1 friend for 3 days (send product/BETA_GUIDE.md), then up to 5 friends for an exam week; measure the D-008 rule
4. Later: Low findings; pace-based "can't finish" warning (needs owner decision); product name; mascot redraw; sharing (ADR needed)

## Open questions
- Do NotebookLM/Knowt plan review backward from an exam date? (check in current apps)
- iOS home-screen storage persistence and .ics alarm reliability: UNKNOWN until real-device test
- PDF import on real phones (speed, iOS legacy pdf.js) and other PDF layouts: UNKNOWN

## Key files
- Paths below are relative to docs/
- Decisions: decisions/DECISION_LOG.md (D-000..D-014)
- Handoff: HANDOFF_FOR_STRATEGIST.md
- Product: product/PRODUCT_SPEC.md, product/ADR-001-platform.md, product/ADR-002-stack-scheduler-import.md, product/ARCHITECTURE.md, product/BUILD_LOG.md, product/AUDIT-001.md, product/BETA_GUIDE.md, product/BETA_TEST_PLAN.md
- App: ../app/README.md (run, test, build, deploy, BYO-AI flow)
- Evidence: research/SOURCE_REGISTER.md (grep S-ID), research/EVIDENCE_LEDGER.md (grep C-/H-ID)
