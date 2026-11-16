# ARCHITECTURE — Nursing Reviewer PWA (v0.1, BUILD-001–004)

A local-first, offline web app that turns a student's own reviewers into short daily active-recall sessions, scheduled with FSRS backward from their exam date. No server, no accounts, no AI calls. Decisions: product/ADR-001-platform.md (PWA now, Capacitor later), product/ADR-002-stack-scheduler-import.md (stack, scheduler, import format).

## 1. Module map (`app/src`)

```
domain/            pure TypeScript, no React, no Dexie; unit-tested
  parser.ts        text → { title, items, errors, warnings }  (canonical format, line-numbered issues)
  scheduler.ts     Scheduler interface + FSRS-6 adapter over ts-fsrs (swap point for SM-2)
  plan.ts          daily plan: due reviews + new-item quota spread to the exam; clamp to exam eve
  readiness.ts     mean FSRS retrievability at the exam date (unreviewed = 0)
  scoring.ts       choice scoring; SATA all-or-nothing with per-choice marks
  session.ts       runner rules after each answer (next / recovery / done)
  streak.ts        gentle streak with one weekly freeze
  backup.ts        backup file: schemaVersion + SHA-256; full validation + migration before writes
  migrations.ts    v1→v2 transform shared by Dexie upgrade and old backup files
  ics.ts           RFC 5545 daily reminder (CRLF, folding, RRULE, VALARM)
  editItem.ts      validation for editing an item
  byoPrompt.ts     the "bring your own AI" prompt text
data/
  db.ts            Dexie schema (v1, v2 + upgrade)
  repo.ts          all reads/writes used by screens (transactions, cascades, export/restore/wipe)
app/               App shell (in-memory routing, context, theme, focus), download helper
screens/           Today, Session, Import, Decks, Deck, Settings, Onboarding
components/        Mascot (original SVG), PageTitle (focus management)
copy.ts            all mascot copy (no guilt, light Taglish)
```

Rule of thumb: **screens → repo → domain**. Domain never imports React or Dexie, so the core rules run in Node tests in under a second.

## 2. Data model (IndexedDB, Dexie schema v2)

| Table | Key / indexes | Fields |
|---|---|---|
| `decks` | `id`, `createdAt` | title, examDate (local `YYYY-MM-DD` or null) |
| `items` | `id`, `deckId`, `dueAt`, `lastGrade` | type (mcq/sata/priority/flashcard), question, choices[], answer[] (indexes), back, rationale, position, card (serialized FSRS state), dueAt (copy of card.dueAt for indexing), firstReviewedAt, lastGrade, flagged |
| `reviews` | `++id`, `itemId`, `deckId`, `at` | grade (again/good/easy), correct (append-only log) |
| `settings` | `key` | reminderTime, sessionDays, onboarded, mascot; device-local: lastExportAt, reminderUid |

- **Migrations:** v1→v2 added `lastGrade` (derived from each item's latest review in one linear pass) and `flagged`. The same pure function migrates old backup files, so both paths produce identical data (tests/unit/migration.test.ts).
- **Why state on the item:** reading "what's due" must be cheap; the review log is kept so a future scheduler can replay history.

## 3. Review flow (sequence)

```
Today screen
  └─ repo.loadAll → plan.buildDailyPlan(decks, items, now)
       reviews due by end of today (oldest first) + new items (quota = max(10, unseen ÷ days to exam))
Start review → snapshot queue (≤10) → [mascot intro] → Question card
  answer → scoring.scoreChoices → feedback + rationale (+ "Report wrong")
  Next   → repo.recordReview (one transaction):
             scheduler.review(card, grade)        wrong=Again, right=Good, "Easy"=Easy
             plan.clampToExam(next due)           never past the day before the exam
             items.put(card, dueAt, lastGrade) + reviews.add(log row)
         → session.afterAnswer → next question | recovery (3 wrong in a row) | done
Done → sessionDays += today (streak) → summary (+ mascot)
```

## 4. Why these choices

- **Local-first:** education data is sensitive (S100); no backend means no breach surface, no cost, no accounts, and it works offline in clinical rotations. Trade-off: data lives on one device, so backup export is mandatory and nudged weekly (ADR-001 amendment 2).
- **PWA:** no store fees or Apple account to reach friends' iPhones and Androids; one TypeScript codebase; Capacitor wrap later (ADR-001). Trade-off: iOS storage is best-effort; reminders are a calendar `.ics`, not push.
- **FSRS:** models recall probability directly, which gives "readiness at exam date" as a by-product; behind an interface so SM-2 could replace it (ADR-002 §3). Configured for whole days (no intra-day steps) because the app is used once a day.
- **One plain-text import format:** deterministic, testable, works for both pasted reviewers and "bring your own AI" output; errors are reported by line and never silently dropped.

## 5. Testing layers

| Layer | Tool | What it proves |
|---|---|---|
| Types | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) | contracts across modules |
| Unit | Vitest + fake-indexeddb | parser grammar and edge cases, FSRS adapter, plan/quota/clamp, readiness math, streak, scoring, session rules, backup validation (incl. re-signed hostile files), v1→v2 migration on a real Dexie DB, repo cascades |
| E2E | Playwright (Chromium) against the **production build + CSP** | import → session → reload → export → wipe → restore; question types; deck edit; onboarding; mascot rules; dark mode; 360px + 44px targets; keyboard-only session; XSS-as-text; 2 MB limit; no off-origin requests; 1,000-item timing |
| Accessibility | @axe-core/playwright | 0 serious/critical on Today, Import, Settings, Decks, Session (light and dark) |

Exact counts and timings: product/BUILD_LOG.md.

## 6. Security model

- **Threats considered:** malicious text in a pasted reviewer (XSS); a tampered or hostile backup file; accidental data exfiltration; data loss.
- **Controls:**
  - Imported text is rendered only as React text nodes; no `dangerouslySetInnerHTML`/`innerHTML` anywhere; no user data in `href`/`src`.
  - Strict CSP (build-time meta): `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`; no inline scripts.
  - No network code; E2E asserts no request leaves the origin.
  - Backups: size cap, JSON parse, app id, schema version, SHA-256 checksum (detects accidental damage, not an attacker), full shape and cross-reference checks, allow-listed settings, migration then re-validation; only then a single transaction replaces the data.
  - Imports capped at 2 MB.
- **Not covered:** a meta CSP cannot set `frame-ancestors` (set it as a header if hosting allows); the checksum is not a signature; anyone with the unlocked phone can read the data.

## 7. Known limitations

- iOS Safari storage eviction is possible; only backups mitigate it. Not yet tested on real devices.
- `.ics` alarm behavior varies by calendar app; untested on devices.
- Navigation is in-memory (no URLs), so the Android back button leaves the app.
- Parser ambiguity: a wrapped line starting exactly with the next expected choice letter ("C. diff" right where choice c belongs) is read as a choice.
- Readiness is an estimate from default FSRS parameters, not personalized; never a promise.
- Today loads all items into memory: fine at 1,000 items (~100 ms); for very large libraries, query by index.
- Placeholder mascot and icons; product name not chosen.

## 8. What I'd change at scale

- **Sync and sharing (v0.2):** an append-only review log per device, merged on a server (CRDT-like, last-writer-wins for item edits); auth; end-to-end encryption, since the content is sensitive.
- **Query by index** instead of loading everything; precompute due counts; virtualize long lists.
- **Personalized FSRS parameters** from each user's review log (the optimizer), and per-deck desired retention.
- **Routing with URLs** (deep links, back button), and Capacitor for native notifications and durable storage.
- **Content trust:** "Show source" links to page numbers; reviewed shared decks; a report-wrong queue that reaches deck authors.
- **Observability without tracking:** opt-in, aggregate, on-device metrics a user can export.
