# Handoff for a new strategist

Written 2026-11-21 by Claude Code from the repo as it stands (git, docs, a fresh test run). Facts were checked, not remembered.
Paths are relative to `docs/` unless they start with `app/` or `../`.

## 1. Project in 5 lines

- **What:** an offline phone app (installable web app) that turns a nursing student's own reviewers into a short daily active-recall plan leading up to their exam date.
- **Who:** Filipino nursing students, course (school) exams first, the board exam (PNLE) later. First users: the owner's 3–5 nursing-student friends.
- **Why:** students mostly reread chatbot-made reviewers; the bet is on active recall plus spacing planned backward from the exam date, built from their own material. The capability already exists elsewhere, so what matters is fit and behavior.
- **Owner:** solo 4th-year CS student, ~7–10 hrs/week, no fixed deadline; portfolio value and commercial potential weigh equally.
- **Budget:** cheap static hosting plus a domain only. No backend, no paid services, no accounts.

## 2. Current state (checked 2026-11-21)

- **Version:** `app/package.json` = **0.2.0**. Not deployed anywhere yet.
- **What it does today:** import a deck by paste/.txt, on-device PDF/DOCX upload, or "bring your own AI" (copy a prompt → run it in your own chatbot → paste the result back). Line-numbered import preview with errors and warnings. Notes detection ("these are study notes", with a Copy prompt button). Question types: multiple choice with rationale, select-all-that-apply, priority, flashcard. FSRS daily sessions with an exam-date clamp; mistakes mode; readiness shown as "rough estimate", with "seen X of Y" next to it. Deck screen: search, edit, delete, report wrong. Onboarding, mascot at transitions, gentle streak, dark mode, `.ics` calendar reminder, backup export/import/wipe, Android back button, tap-to-update banner, version and "Copy feedback info" in Settings, a "check your source / not medical advice" notice.
- **Tests (run today on the staged tree, in `app/`):**

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | PASS (exit 0) |
| Unit | `npm test` | PASS 267/267 (18 files) |
| E2E | `npm run test:e2e` | PASS 39/39 (Chromium, 1.5 min) |

- Not run today: `npm run build`, `npm audit`, `npm run test:audit*`. BUILD_LOG says the audit repro suite has 7 failures by design (unfixed Low findings).

## 3. Git state

- Branch `main`, HEAD = `b7355c8`, matching `origin/main` (public repo `OppiRah/NursingReviewerIGuess`). Last commits:
  - `b7355c8` BUILD-006: robust BYO-AI parsing, notes detection, DOCX size guard, history fixes
  - `4ddf97d` BUILD-001–005: import, sessions, FSRS, question types, readiness, onboarding, backup…
  - `927e680` SPIKE-001 PWA check; ADR-001 approved (amended)
  - `333e47f` add spec stuff · `4eab41d` initialize discovery record
- **Staged, NOT committed: 42 files, +1,942 / −33.** This is all of AUDIT-001 + FIX-001 + BETA-PREP (v0.2.0): update banner, version, feedback info, audit tests, `AUDIT-001.md`, `BETA_GUIDE.md`, `BETA_TEST_PLAN.md`, plus doc updates. Nothing unstaged, no untracked files.
- So the remote still has the pre-audit code with the three High findings. The owner has to commit and push.

## 4. Key decisions (full entries: `decisions/DECISION_LOG.md`)

- **D-000–D-007:** discovery workspace; candidates A–G screened, F/G closed; git set up; interview notes and owner sample files kept out of git.
- **D-008:** product H selected by **owner override**, with formal interviews skipped. Validation rule: ≥3 of 5 friends use it on ≥3 different days in the week before a school exam, without reminders from the owner. Stop/rethink if that fails, or if friends trust chatbot + rereading more.
- **D-009/D-010:** ADR-001: PWA now, Capacitor later. Reminders = calendar `.ics` (no push server). Backup export is mandatory, since iOS storage can be evicted.
- **D-011:** 7-day spike device test skipped, owner accepts the iOS risk. ADR-002 adopted. BUILD-001–004 authorized.
- **D-012:** BUILD-005: real PDFs parsed to 0 items, so normalization/recovery and on-device PDF/DOCX reading were added.
- **D-013:** BUILD-006: most friends keep prose notes, so BYO-AI became the **main** import path. The app itself never calls an AI.
- **D-014:** AUDIT-001 = GO with must-fix list. FIX-001 fixes + beta prep, v0.2.0.

## 5. Architecture in brief (`product/ARCHITECTURE.md`, ADR-002)

- Vite + React 19 + TypeScript strict; static build; PWA service worker; strict CSP (`connect-src 'self'`).
- **Local-first:** Dexie/IndexedDB only (decks, items, append-only reviews, settings). Backup = JSON with schema version + SHA-256, fully validated before restore, restored atomically.
- **Scheduler:** FSRS-6 via `ts-fsrs`, behind our own `Scheduler` interface (so SM-2 could be swapped in). Retention 0.9, whole days, due dates clamped before the exam.
- **Import paths:** (1) paste/.txt; (2) `.pdf` (pdfjs-dist, local worker) and `.docx` (mammoth, raw text, zip-bomb guard), lazy-loaded; (3) BYO-AI prompt → student's chatbot → paste. All three feed one plain-text parser with line-numbered errors. Choice questions are never dropped silently.
- **No network calls from the app.** The audit checked this by code search and CSP.

## 6. Open items

- **AUDIT-001** (`product/AUDIT-001.md`, frozen, SHA-256 matches BUILD_LOG): 0 Critical, 3 High, 6 Medium, 11 Low.
  - Fixed: A-01, A-02, A-03 (all High), A-04, A-07, A-09.
  - **Partly fixed, open:** A-05 (300 items / 3 days still asks 100 on day 1; never says "can't finish at this pace"), A-06 (the readiness number is unchanged; 97% after one pass with 30% wrong), A-08 (backup is marked "done" as soon as the download starts, even if the phone saved nothing).
  - Low A-10–A-20 left listed. Includes "Show source" from the spec (A-16), deferred in D-014.
  - Accepted: prose with a `Question N:` line right before an `A:` line becomes a bogus flashcard.
- The fixes made after the verification subagent's pass were **not re-verified** by a second independent pass.
- The audit's independence was weak: it ran in the builder's session after a model switch.
- The owner should review the "Decisions made alone" lists in BUILD_LOG (BUILD-005, BUILD-006, FIX-001).
- Not decided yet: product name; mascot redraw (current one is an original placeholder SVG; the AI concept image is not used); v0.2 sharing (needs an ADR).

## 7. NOT done yet

- **No real-phone testing at all.** iOS home-screen storage survival, `.ics` alarms, update banner, clipboard, export saving, file pickers, PDF speed on low-end Android, offline use: all UNKNOWN. Everything so far is desktop Chromium only.
- **No deploy** (the plan is for the owner to drag `app/dist` to Netlify Drop) and **no friend beta.** Stage 0 = the 10 phone checks in `product/BETA_TEST_PLAN.md`.
- No interviews (skipped, D-008). Competitor check still open: do NotebookLM or Knowt plan review backward from an exam date?

## 8. Working rules the strategist must keep

1. **Bounded prompts:** every task to Claude Code states scope (allowed paths, what is out of scope), verification (exact commands, real PASS/FAIL/NOT RUN), and the report format (outcome → changed files → verification → uncertainty → next).
2. **Git:** Claude Code stages and asks before every commit or push; `git commit`/`git push` are denied in `.claude/settings.json`, so the **owner runs them**. No force-push or history rewrite.
3. **No AI attribution** in commits or PRs: no Co-Authored-By, no "Generated with" lines. The owner is the only author.
4. **Synthetic test fixtures only.** The owner's reviewer files are private and copyrighted. They never go into the repo, prompts or tests. Report only anonymized patterns and counts.
5. **No network calls from the app.** No AI APIs, analytics, remote fonts or CDNs. No new dependencies unless a prompt names them.
6. **`docs/STATUS.md` is read first and updated last** (≤60 lines, replace stale lines). Decisions go in DECISION_LOG with a D-ID.
7. No deploys, accounts, paid services or contact with outsiders by agents. Implementation only within an explicitly authorized task.
8. No invented sources or claims. Label claims VERIFIED_PRIMARY / REPORTED_USER / SECONDARY / INFERENCE / HYPOTHESIS / UNKNOWN (see `../CLAUDE.md`).

## 9. Recommended next 3 steps

1. **Owner commits and pushes the staged v0.2.0 set** after skimming the BUILD_LOG "FIX-001" decisions. Until then the public repo has the High-severity bugs.
2. **Owner builds, deploys to Netlify Drop, and runs stage 0 on a real iPhone and a real Android** (the 10 checks in `BETA_TEST_PLAN.md`; backup saving and storage survival first). Write the results into BUILD_LOG/STATUS.
3. **Then a 1-friend, 3-day beta** (send `BETA_GUIDE.md`), then up to 5 friends for one exam week, scored against the D-008 rule. If a phone check fails, fix A-08 (and A-05 if workload is the problem) before adding friends. Don't add features first.

## 10. File map

| Need | Read |
|---|---|
| Current state, next actions | `STATUS.md` |
| Why each choice was made | `decisions/DECISION_LOG.md` (D-000–D-014) |
| What the product is | `product/PRODUCT_SPEC.md` (some §5/§11 lines are stale, see below) |
| Platform / stack / import format | `product/ADR-001-platform.md`, `product/ADR-002-stack-scheduler-import.md` (+ addenda) |
| Code structure | `product/ARCHITECTURE.md`, `../app/README.md` |
| What was built, gate results, decisions made alone | `product/BUILD_LOG.md` (newest at the bottom) |
| Audit findings | `product/AUDIT-001.md` (frozen; fix status in BUILD_LOG "FIX-001") |
| Beta | `product/BETA_TEST_PLAN.md`, `product/BETA_GUIDE.md` |
| Evidence | `research/SOURCE_REGISTER.md` (S-IDs), `research/EVIDENCE_LEDGER.md` (C-/H-IDs); grep, don't read whole |
| Agent rules | `../CLAUDE.md` (top section is stale, see below) |

**Docs that contradict reality (fix in a small docs task):**
- `../CLAUDE.md` still says "No product has been chosen", and its V3 section forbids tests and fixtures. Both were overtaken by D-008/D-011.
- `PRODUCT_SPEC.md` header says "Implementation: not authorized", and §5/§11 still list FSRS vs SM-2 and the platform as open. All were decided in D-010/D-011.
- The ADR-001 header says "PROPOSED, awaiting approval". The approval is only recorded at the bottom (line 118) and in D-010.
