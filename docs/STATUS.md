# STATUS — read first, update last (≤60 lines)
Last updated: 2026-11-14 · **Product selected: H (D-008)** · implementation NOT authorized
Repo: github.com/OppiRah/NursingReviewerIGuess (public). Interview notes are local-only in research/interviews/notes/ (gitignored).
Git rule: ask the owner before every commit/push (explicit "yes"); no AI attribution. See ../CLAUDE.md "Git policy".

## Owner constraints
- ~7–10 hrs/week (strategist estimate); cheap hosting + domain only; no fixed deadline
- Goals: portfolio value and commercial potential weighted equally
- Solely owned: BuildTrack, ShortsLab, Jairus, Notification Bridge. CALSS co-owned (problem area only). Capstone excluded.

## Product H (selected, D-008)
- Nursing student reviewer: own reviewers → daily active-recall plan to exam date; school exams first, PNLE later
- Spec: product/PRODUCT_SPEC.md (v0.1 scope, mascot "Momentum Companion", risks, open decisions)
- Validation: friends prototype. Success = ≥3 of 5 friends use it on ≥3 days in the week before a school exam, unprompted
- Stop/rethink: rule not met in first real exam week, or friends trust chatbot + reading more than the app
- Formal interviews skipped (owner decision); interview kit kept for optional use
- Main substitute: ChatGPT/Claude (make reviewers, quiz on request)
- Key risks: medical-content accuracy; copyright of review-center material; privacy (education data sensitive); iOS cost
- Mascot v0 image is AI-generated (ownership UNKNOWN) → redraw before public launch

## Other candidates
| ID | Candidate | Status |
|---|---|---|
| C, E, A | Contractor trail, instructor case record, portfolio | recorded; not pursued |
| B, D | QA release record, clipping | parked |
| F, G | Voice, notifications | closed commercially |

## Next actions
1. Owner: platform/architecture decision (PWA vs Expo; local-first storage; FSRS vs SM-2)
2. Owner: separate first-build authorization (none yet)
3. Strategy chat: draft the "bring your own AI" prompt format and build plan for approval

## Open questions
- Do NotebookLM/Knowt plan review backward from an exam date? (check in current apps)
- Handoff studies (AJRNH 2026, PNLE Reviewer PH features) still UNKNOWN; Dunlosky now SECONDARY via APS summary (S113)

## Key files
- Paths below are relative to docs/
- Decisions: decisions/DECISION_LOG.md (D-000..D-008), decisions/PHASE_GATE_1_TO_2.md
- Product: product/PRODUCT_SPEC.md, product/research/PRODUCT_MASCOT_RESEARCH.md (unverified input), product/assets/
- Evidence: research/SOURCE_REGISTER.md (grep S-ID), research/EVIDENCE_LEDGER.md (grep C-/H-ID)
- Landscape: research/COMPETITIVE_LANDSCAPE.md (sections A–H, PH context)
