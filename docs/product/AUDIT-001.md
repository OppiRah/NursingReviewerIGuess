# AUDIT-001 — independent audit before the friend beta

- **Date:** 2026-11-16 · **Auditor:** Claude Code (Fable 5.2) · **Audited:** `app/` at commit `b7355c8` (BUILD-001–006, built and reviewed by Opus)
- **Question:** is this safe and good enough to hand to 3–5 nursing-student friends for a real exam week, and what would hurt them if it isn't?
- **Method:** read the code; ran the builder's gates; wrote new reproduction tests (`app/tests/audit/`, run with `npm run test:audit` and `npm run test:audit:e2e`). No product code was changed in this phase.
- **Independence caveat (fact):** the audit ran in the same Claude Code session that built BUILD-005/006, after the model was switched to Fable. The session context contained the builder's summary. Findings below rest on code read and tests run during the audit, not on that summary, but this is weaker independence than a fresh session.

## Verdict: GO with must-fix list

The core study path is sound: across 3,000 seeded random decks, no multiple-choice, select-all or priority question was ever saved with a wrong answer or the wrong rationale, scoring is correct, backups are complete and restores are atomic. Three things could still hurt a student in an exam week: editing an item can silently change which choice is marked correct (A-01), a numbered flashcard can be silently swallowed into the previous question's rationale (A-02), and a fix cannot be delivered predictably because new versions wait behind the old one with no version shown (A-03). Fix the must-fix list first; none of it needs a redesign.

**Counts:** Critical 0 · High 3 · Medium 6 · Low 11.

## Findings

Severity = harm to a student. "Fact" = reproduced by a test or visible in the cited code. "Judgment" = my assessment.

| ID | Sev | Area | Evidence | Student-facing impact | Suggested fix |
|---|---|---|---|---|---|
| A-01 | High | Study correctness (edit) | `src/domain/editItem.ts:38-49`; test `data.audit › deleting a middle choice…` (fact: answer moves from "Gamma" to "Delta", no error) | A student who deletes or reorders a choice line in the item editor and saves, without retyping the letter, now has a different choice marked correct. They then study the wrong answer. | When the choice list changes length or order, keep the answer attached to the same choice text; if the correct choice was removed, refuse to save until a new answer is picked. Show the resolved answer text ("Correct: c. Gamma") live in the editor. |
| A-02 | High | Study correctness (import) | `src/domain/parser.ts:361-364`; tests `parser-repro › A-02`, `roundtrip › T1` (≈90 of 1,500 decks) (fact) | `Q2: … / A: …` (numbered flashcard) directly after a question with a rationale, with a blank line, page break or nothing between them, disappears as an item. Its question and answer text are appended to the previous question's rationale. No error or warning. Introduced by the BUILD-006 review fix "original text kept inside a rationale". | Treat a `Q<n>:`/`Question <n>:` line as a new question when an `A:` line follows (same look-ahead the normalizer already does), before the "keep in rationale" rule. |
| A-03 | High | PWA update path | `vite.config.ts:35-36`; built `dist/sw.js` contains `skipWaiting()` only inside a `SKIP_WAITING` message handler and no `clientsClaim`; `dist/registerSW.js` only registers (fact). Effect on real phones: judgment, not testable here (E2E blocks service workers). | A new version downloads but waits until every window of the app is fully closed. Installed apps are often only suspended, so a friend can stay on an old version for days. The app shows no version, so nobody can tell. A fix for a wrong-answer bug cannot be delivered predictably during the exam week. | Register the worker from app code with an "update available" prompt: show a banner outside sessions, send `SKIP_WAITING` and reload on tap. Show version and build date in Settings. |
| A-04 | Medium | Exam plan | `src/domain/plan.ts:35`; test `plan-sim › after the exam date has passed…` (fact: quota 300 vs 43 with no date) | The day after an exam date passes, every never-seen item in that deck is "due today" at once (300 of 300). | Treat a passed exam date like "no date" for the new-item spread. |
| A-05 | Medium | Exam plan | `src/domain/plan.ts:66,76-81`; test `plan-sim › 300 items, 3 days` (fact; table in test output) | 300 items 3 days out: the plan asks for 100, 130, then 300 items/day (10–30 sessions of 10). Doing 3 sessions a day leaves 247 items never seen. On the last day every reviewed item is due at the same instant, so which 10 come up is arbitrary, not the weakest first. Today shows the true count but gives no sense of sessions or priority (judgment). | Order due reviews by lowest estimated recall first. On Today, show the workload in sessions ("about 30 sessions") and say plainly when the deck can't be finished at this pace. |
| A-06 | Medium | Honesty (readiness) | `src/domain/readiness.ts:19-25`; `plan-sim` tables (fact: 97% the day before the exam after one pass with 30% answered wrong; a just-missed item counts ≈77%) | "Readiness (estimated): 97%" after seeing each question once, using default FSRS parameters never checked against these students. A student may stop reviewing. It is 0% when nothing is reviewed and low when most items are unseen (fact), so it is optimistic, not random. | Add "seen X of Y" next to it; call it a rough estimate in the hint on Today as well as on the deck screen. Consider counting items whose last answer was wrong as not ready. |
| A-07 | Medium | Honesty / accuracy | No text in `src/` warns that imported or AI-made questions can be wrong, or that the app is not medical advice (`grep -i "medical\|advice"` over `src/`: only a code comment) (fact) | The main import path is a chatbot writing questions from notes. Nothing in the app tells the student to check answers against their source before trusting them. | One plain line on Import and in the session feedback area: questions come from your own material or your chatbot, may contain mistakes, check your source; not medical advice. |
| A-08 | Medium | Data safety (backup) | `src/app/download.ts`; `src/screens/SettingsScreen.tsx:49-58` (fact: "Backup saved to your downloads" and `lastExportAt` are set as soon as the download is handed to the browser). Whether iOS home-screen apps actually save the file: unknown here. | If the phone did not save the file, the app still says the backup was saved and stops reminding for 7 days. The student believes they have a backup. | Reword to "check that the file is in your Files/Downloads"; on phones that support it, use the share sheet for the file; real-device check before the beta. |
| A-09 | Medium | PWA update path | `vite.config.ts` (`globIgnores`, CacheFirst for readers) (fact). Failure mode is judgment, not testable here. | After a deploy, an app still running old code asks for the old PDF/Word reader file, which the host no longer has; file import fails until the app restarts into the new version. First-ever PDF/Word import also needs a connection. | Covered by A-03's reload; also show "needs internet the first time" when a reader fails to load. |
| A-10 | Low | Import | `src/domain/parser.ts:403-407`; test `parser-repro › A-09` | A `___` line after a flashcard is appended to its answer text ("Back ___"). | Treat `___` after a flashcard's `A:` as a separator. |
| A-11 | Low | Import | `src/domain/parser.ts:344-351`; test `parser-repro › A-10` | "Let me know if you want more!" after a last flashcard with no rationale becomes part of that card's answer. | Count a flashcard with an `A:` line as finished. |
| A-12 | Low | Import | `src/domain/normalize.ts:190-200`; test `parser-repro › A-11`; `roundtrip › T2` (126 of 1,500 rejected, all this pattern) | `Q1:` flashcard whose question wraps onto a second line is rejected with a misleading "needs at least 2 lettered choices". Not silent. | Look ahead past continuation lines for the `A:` line. |
| A-13 | Low | Import | test `parser-repro › A-12`; `roundtrip › T3` | A wrapped line that happens to start with "Reason:", "Explanation:" or "Rationale:" inside a flashcard question cuts the question there; the rest becomes the rationale. Rare in practice (judgment). | Only accept a rationale label after an answer line. |
| A-14 | Low | Import | `roundtrip › T3` | `**bold**` and `__x__` markers are removed from text everywhere (by design); a literal `__5__` blank loses its underscores. | Leave as is; note in the format help. |
| A-15 | Low | Honesty (copy) | `src/screens/OnboardingScreen.tsx` step 3: "makes sure every item comes back before exam day" | A promise the plan cannot keep if the student does fewer sessions than planned (A-05). | "Aims to bring every item back before exam day." |
| A-16 | Low | Spec drift | `PRODUCT_SPEC.md` §4 "Every item: Report wrong and Show source"; no "Show source" in `src/`; no decision entry found (`grep -i "show source"` in DECISION_LOG and BUILD_LOG: none) | No way to see where an item came from. | Record the deferral as a decision; A-07's notice covers the interim. |
| A-17 | Low | Study correctness (edit) | `src/data/repo.ts:95-98` | After fixing a wrong answer key, the item keeps the schedule and "mistake" status earned under the wrong key. | Offer "review this again soon" after an answer change. |
| A-18 | Low | Scheduling | test `plan-sim › clock set back` | Reviews done while the phone clock was wrong (far future) are not due again until that future date. | Ignore; or clamp a due date that is implausibly far after a clock correction. |
| A-19 | Low | Security | `src/import/zipGuard.ts:6-9` (documented by the builder) | A crafted Word file that under-declares sizes can still exhaust the tab's memory. Only affects a file the student chose. | Accept for the beta. |
| A-20 | Low | Import UX | `src/screens/ImportScreen.tsx` preview shows counts and problems only | The student cannot see the parsed questions and answers before saving. | Show the first few parsed items in the preview. |

**Checked and found correct (facts):**
- Scoring (`scoring.ts`): single-answer and select-all are exact-set matches; per-choice marks are right.
- Letter → index mapping at import: choices must be lettered in order, so a skipped or repeated letter is an error, never a shift.
- `roundtrip` T1 + T2: 3,000 decks with bold, fences, `Q1:`/`Question 1:` styles, CRLF, page breaks, PDF-style wrapping: every silent mismatch involved flashcards (A-02, A-10, A-11). None involved a multiple-choice, select-all or priority item.
- Day boundary is local time; a review at 23:58 and a plan at 00:02 fall on different days (`plan-sim`). Readiness is 0% with nothing reviewed.
- Old code can still open a database upgraded by newer code (Dexie 4 tolerates it; `data.audit`), so a stale tab does not crash on a newer schema.

## Must-fix before beta

1. **A-01** editing can silently re-point the correct answer.
2. **A-02** numbered flashcards swallowed into the previous rationale.
3. **A-03** update prompt + visible version, so a fix can reach friends in exam week.
4. **A-07** one-line "check your source / not medical advice" notice.
5. **A-08** backup wording, plus the real-device check that the file is actually saved.
6. **A-04, A-05** passed-exam flood and weakest-first ordering (cheap; they shape what a time-poor student sees the night before).

## Builder claims checked

| Claim (BUILD_LOG) | Result |
|---|---|
| Gates: typecheck clean, 233/233 unit, 33/33 E2E | **Verified** (re-run in this audit) |
| Acceptance chatbot sample → 2 items, 0 errors; three other styles parse | **Verified** (tests read and re-run) |
| BUILD-006 review fixes #9/#10 (original text kept inside a rationale) | **Contradicted in part**: the fix introduced A-02 |
| "Every item comes back before the exam" (exam-date clamp) | **Contradicted in part**: true only for items already reviewed, and only if the student does every session (A-05) |
| Restore is atomic; a bad backup changes nothing | **Verified** (`data.audit`: forced mid-restore failure keeps old data) |
| Export is a complete backup | **Verified** (`audit.spec`: restored into a fresh browser profile; every row of every store equal) |
| Strict CSP in the built page; `_headers` present | **Verified** in `dist/index.html` and `dist/_headers` |
| No network use; data never leaves the device | **Verified** by code search (no fetch/XHR/beacon/WebSocket in `src/`) and CSP `connect-src 'self'` |
| Imported text is rendered as text only | **Verified** (no `innerHTML`/`dangerouslySetInnerHTML` in `src/`) |
| pdf.js: local worker, no eval, no font loading, no remote fetches | **Verified**: options in `extract.ts`; `isEvalSupported` does not exist in pdfjs-dist 6.5.438; worker bundled. 6.5.438 is the current npm release |
| mammoth: raw text only, guard runs first | **Verified** (`extract.ts`) |
| `npm audit --omit=dev` | Builder: NOT RUN. **Run in this audit: 0 vulnerabilities** |
| Readers not precached, runtime-cached | **Verified** in `dist/sw.js` |
| Accessibility: 0 serious/critical axe issues | **Verified and extended**: 0 issues at any impact level on 16 screens/states × light and dark (`audit.spec`) |
| Initial JS ≈133 KB gzipped | **Verified** (133,780 bytes) |
| `registerType: 'autoUpdate'` keeps friends up to date | **Contradicted**: built worker does not activate on its own (A-03) |
| Offline use, install, iOS storage, `.ics` alarms, phone performance | **Not verifiable here** (builder also marked NOT RUN) |

## Real-device test list (owner, in priority order)

1. **Backup really saves (iPhone home-screen app, then Android):** Export backup → find the `.json` in Files/Downloads → restore it on the other phone. Look for: file exists, restore shows the same decks and counts.
2. **Data survives:** install to the home screen, import a deck, do a session, close the app fully, reopen after a day. Look for: deck and progress still there (iOS storage eviction).
3. **Update arrives:** deploy a new build, open the installed app, close it fully, reopen. Look for: the new version and build date in Settings.
4. **Copy prompt on iPhone Safari and in the installed app:** tap Copy prompt, paste into ChatGPT. Look for: the full prompt, not an error message.
5. **Full BYO-AI loop on a phone:** prompt + real notes in ChatGPT → copy the answer → paste into Import. Look for: question count matches what the chatbot wrote; skim 5 answers against the notes.
6. **File picker in the installed app:** choose a `.pdf` and a `.docx` from Files/Drive. Look for: picker offers them; text appears.
7. **Large PDF on a low-end Android:** a 100+ page text PDF. Look for: progress moves, the app doesn't reload or go blank (memory).
8. **Offline:** airplane mode, open the installed app, do a session. Look for: works; PDF import says something sensible if never used online.
9. **Calendar reminder:** add the `.ics` on iPhone and Android. Look for: one repeating event with an alert at the chosen time; downloading again doesn't duplicate it.
10. **Android back button and iPhone swipe-back during a session:** Look for: the "Leave this session?" dialog, no lost answers.

## What's genuinely good

- **Import fails loudly, not silently, for choice questions.** Out-of-order letters, a missing answer, two answers in one block and unknown answer text are all errors with line numbers; the randomized tests found no silent wrong answer on any choice-type item.
- **Backup validation is careful:** checksum, per-field checks, cross-references, unknown-field stripping, one transaction for restore. A forced failure halfway left the old data intact.
- **Nothing leaves the device,** and the build enforces it (strict CSP, no remote origins, local PDF worker).
- **Accessibility is clean** on every screen I could reach, in both themes, at every axe impact level.
- **Readiness is honest at the low end:** 0% when nothing is reviewed, 17% when most of a deck is unseen.
- **Dates are local-calendar throughout,** with DST-safe day arithmetic; no UTC/Manila off-by-one found.
