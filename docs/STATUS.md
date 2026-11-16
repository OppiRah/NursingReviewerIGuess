# STATUS — read first, update last (≤60 lines)
Last updated: 2026-11-16 · **Product: H (D-008)** · **BUILD-001–005 built (D-011, D-012), not released, not committed**
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
- Gates: see product/BUILD_LOG.md (final report at the end)

## Next actions
1. Owner: review BUILD_LOG "decisions made alone" (BUILD-001–005) + commit/push (agents can't commit: denied in settings)
2. Owner: deploy app/dist via Netlify Drop; run the real-device checklist in BUILD_LOG (iPhone storage, .ics alarms, install)
3. Give it to 5 friends a week before a school exam; measure the D-008 rule
4. Later: product name; mascot redraw; v0.2 sharing (ADR needed)

## Open questions
- Do NotebookLM/Knowt plan review backward from an exam date? (check in current apps)
- iOS home-screen storage persistence and .ics alarm reliability: UNKNOWN until real-device test
- PDF import on real phones (speed, iOS legacy pdf.js) and other PDF layouts: UNKNOWN

## Key files
- Paths below are relative to docs/
- Decisions: decisions/DECISION_LOG.md (D-000..D-012)
- Product: product/PRODUCT_SPEC.md, product/ADR-001-platform.md, product/ADR-002-stack-scheduler-import.md, product/ARCHITECTURE.md, product/BUILD_LOG.md
- App: ../app/README.md (run, test, build, deploy, BYO-AI flow)
- Evidence: research/SOURCE_REGISTER.md (grep S-ID), research/EVIDENCE_LEDGER.md (grep C-/H-ID)
