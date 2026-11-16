# ADR-002 — Stack, scheduler and import format

- **Status:** ADOPTED by the owner, 2026-11-14 (D-011) · **Builds on:** ADR-001 (amended, D-010)
- **Spec:** product/PRODUCT_SPEC.md §4, §5, §11 (open decisions 2, 3, 6)

## 1. Stack — Vite + React + TypeScript (strict)

- **Why:** the owner already knows TypeScript; React + TS has the highest interview and portfolio value; a Vite static build wraps cleanly with Capacitor later (ADR-001 option C). `INFERENCE`
- **Alternatives:** Svelte (smaller bundles, less familiar, less interview signal); Preact (smaller runtime, React-compatible, but compat edge cases for little gain at this size).
- **Rules:** `strict: true`; no `dangerouslySetInnerHTML`; all imported text rendered as React text nodes; no remote calls of any kind.

## 2. Storage — IndexedDB via Dexie

- On-device only. Versioned Dexie schema; every schema bump ships an `upgrade()` migration and a test.
- Tables: `decks`, `items` (with serialized scheduler state), `reviews` (append-only log), `settings` (key/value, includes `meta`-type values such as last export date).
- Backup = one JSON file with `schemaVersion` and a SHA-256 checksum; validated fully before any existing data is touched.
- Deviation from ADR-001 §5: scheduling state is **stored on the item** (FSRS card) rather than re-derived from `reviews` on every load. The review log is still kept, so a scheduler swap can replay it.

## 3. Scheduler — FSRS via `ts-fsrs` behind our own interface

- `ts-fsrs` (MIT, FSRS-6 parameters) wrapped by a `Scheduler` interface (`newState`, `review`, `isDue`, `retrievability`, `serialize`/`deserialize`), so SM-2 can be swapped in without touching screens or storage.
- **Why FSRS over SM-2:** it models retrievability directly, which gives "readiness at exam date" for free; it is the current open-source default in Anki. `INFERENCE`; no learning-outcome claims to users (PRODUCT_SPEC §3).
- **Config (BUILD-001):** `ts-fsrs` 6.0.0 (requires Node ≥24 for tooling), `version: 'FSRS-6'`, desired retention 0.9, short-term steps off (whole days), fuzz off. Next due dates are clamped to the day before the exam.
- **Rating map:** wrong → `Again`; right → `Good`; optional "Easy" button → `Easy`. Flashcards: "Missed it" → `Again`, "Got it" → `Good`.

## 4. Canonical import format

One plain-text format for both pasted reviewers and "bring your own AI" output.

```
# Optional deck title
1. Question text (may wrap)
a. choice          (a. / a) / A. / A) all accepted)
b. choice
c. choice
d. choice
Answer: b
Rationale: text (may wrap)
---                (optional separator)
```

- A numbered line (`1.` or `1)`) starts a new block; `---` also ends a block.
- `Answer:` must reference an existing choice letter. Fewer than 2 choices, a missing answer, or an answer outside the choices is an **error** reported with its line number. Malformed blocks are **never silently dropped**: they appear in the preview and are not saved.
- A missing rationale is a **warning**; the item is still saved.
- Input is normalized: CRLF → LF, BOM stripped, trailing whitespace trimmed.
- Import size limit: 2 MB.

## 5. BYO-AI prompt

A fixed prompt lives in the app (`app/src/domain/byoPrompt.ts`) with a **Copy** button. It tells the student's own chatbot to output exactly the format above, with a rationale for every item, using **only** the material the student pastes, and to write nothing else. The app makes no AI calls (PRODUCT_SPEC §4b).

## 6. Consequences

- (+) Deterministic, testable import; one parser for both intake paths.
- (+) Scheduler and storage are swappable behind interfaces.
- (−) React + Dexie + ts-fsrs is heavier than vanilla; budget is ≤250 KB gzipped initial JS (checked in BUILD-004).
- (−) iOS storage eviction is still possible; mitigated only by backup export and nudges.

## Addendum M2 — question types (backwards compatible)

- **Select all that apply:** `Answer: a, c, d` (comma or space separated). Every letter must be a choice. Scored **all-or-nothing** for scheduling; the UI shows which choices were right or wrong.
- **Priority / first action:** optional `Type: priority` line before the question line. Single answer; rendered as multiple choice with a "Priority" badge; rationale shown prominently.
- **Flashcards:** `Q: …` then `A: …` (both may wrap), no choices. Optional `Rationale:`; no warning if missing. Self-graded.
- Blocks of all types may be mixed in one deck. Old v1 text parses identically.

## Addendum BUILD-005 — real-world import (D-012)

**Why:** text copied from one of the owner's real 200-question PDF reviewers parsed to **0 items / 377 errors**; with two extraction artifacts fixed it gave **200 / 0** (strategy chat, 2026-11-14; the file itself is private and never enters the repo). Students should also be able to upload the PDF or Word file directly.

**Normalization (before parsing; `src/domain/normalize.ts`).** Every normalized line keeps its **original** line number, so errors still point at the right line of the editable preview.
- Form feeds (`\f`, `\v`) split a line; BOM, zero-width characters and soft hyphens removed; NBSP → space; CRLF/CR → LF; tabs → space; trailing whitespace trimmed.
- Leading bullet glyphs (`•`, `●`, `◦`, `▪`, `‣`, `∙`, `·`) removed.
- `--2. …` / `---12) …` (2+ dashes glued to a question number) → a separator plus the question line. Lines of only `—`, `–` or `_` (3+) are separators.
- Headings (`CHAPTER 3`, `SECTION 1: …`, `Unit 2 – …`, `Topic: …`; a keyword plus a number/roman numeral or a colon) are ignored anywhere, reported as **one** summary warning ("N heading lines ignored"). The first heading becomes the deck-title suggestion when there is no `#` title.

**Parser changes (`src/domain/parser.ts`).**
- **Recovery:** a block with a second `Answer:` line is split at the numbered line (`^\d+[.)]`, space optional) between the two answers, if choices follow it; the input is re-parsed with that line forced to start a question (≤ 50 passes). Warning: "Recovered N questions from a merged block near line X". If no split point exists, the old error ("more than one Answer:") is reported.
- **Isolation:** errors stay inside their block; the blocks after a broken one are unaffected (tested: 50 blocks with one broken → 49 items, 1 error).
- **Capital-letter choices (`C. diff`, `E. coli`):** a capital `X.` line is a choice only if it is the next expected letter, no `Answer:` has been seen in the block, the block's earlier choices were not lowercase, and it is not a wrapped abbreviation (`C. diff`, `E. coli`, `S. aureus`, `A. fib` … fixed word list). Lowercase markers keep the strict reading, so out-of-order lowercase letters remain an error.

**File upload (`src/import/`).** `.pdf`, `.docx`, `.txt`, `.md`; ≤ 15 MB; PDFs read up to 300 pages with a progress line.
- **PDF:** pdf.js (`pdfjs-dist` 6.5.438, Apache-2.0), **legacy build** for older iOS Safari, worker bundled locally (`?url`), `useWasm: false`, `useWorkerFetch: false`, `disableFontFace: true`: nothing is fetched. Lines are rebuilt from text-run positions (same baseline → one line, top to bottom, left to right).
- **DOCX:** mammoth (`mammoth` 1.13.0, BSD-2-Clause) `extractRawText` only; its HTML output is never used.
- The extracted text goes into the **editable textarea** before parsing, so students fix problems before saving. Rendering stays plain text.
- Both libraries are **lazy-loaded** on the Import screen and **not precached**; a runtime cache keeps them after first use, so later imports also work offline.

**No OCR.** Scanned PDFs and slide exports have no text layer. When more than half the pages have under 20 visible characters, the app says so honestly and suggests the original Google Doc/Word file or the AI prompt. OCR (e.g. Tesseract) would add a multi-MB download and run slowly on phones, and its accuracy on handwritten annotations is unreliable for medical content (the earlier sample-file check misread "WBC <1%" as "WBL 21%", C119). Revisit only if friends' files are mostly scans.

## Addendum BUILD-006 — chatbot output, study notes, guards (D-013)

**Why:** the strategy chat's check on the owner's private files (never in the repo): the 200-question Q&A PDF now gives 200/0, but two real **prose** reviewers gave 0 items with 436 warnings / 102 errors, and a typical chatbot answer (code fence, bold, small talk) gave 1 item / 4 errors. Most friends' material is notes, so the **BYO-AI prompt is the main path** and its output must parse whether or not the chatbot obeys the prompt.

**Chatbot tolerance (`normalize.ts`, per line, original line numbers kept):**
- ```` ``` ```` / `~~~` fences (with or without a language) → separator.
- Emphasis removed: whole-line `**…**`, `__…__`, `*…*`, `_…_`; emphasized label prefixes (`**Answer:**`, `*Rationale:*`, `**Q1.**`, `**Answer**:`); inline `**bold**`; `__x__` only at word boundaries. Never inside words (`snake_case`, `sample_value_x` stay).
- `- `, `* `, `+ `, `##`–`######` markers removed **only** before question structure (numbers, choices, labels); inside a rationale the original line is kept. `## 1. Cardio` with no choices after it is a section heading.
- Question numbers: `1.`, `1)`, `Q1.`, `Q1:`, `Question 1:`, `Question 1.` (a bare `1.` or `Question 1` line starts a question when choices/Answer follow; `Q1:` + `A:` is a flashcard; `Q2.5 units` is left alone).
- Labels: `Answer:`, `Correct answer:`, `Ans:`, `Rationale:`, `Explanation:`, `Reason:` (case-insensitive, optional bold). A second rationale-type line appends.
- Answer values: `b`, `B`, `(b)`, `b.`, `b) Beta`, `B - Beta`, `Option B`, `Options A and C`.
- Small talk is ignored outside questions. Inside a finished question only a **sign-off** ("Let me know…", "I hope this helps") followed by nothing but more small talk is dropped; "Here is why B is wrong…" in a rationale is kept. **All** text outside questions is reported as **one** summary warning.

**Notes detection (Import screen):** 0 items, > 300 words and fewer than 2 `Answer:` lines (a broken question deck shows its real errors instead) → a card "This looks like study notes, not questions" with the 3 BYO-AI steps and a **Copy prompt** button; the error/warning details sit behind a collapsed "Show details". Some items plus ≥ 150 words outside any question (`ParseResult.ignoredWords`) → one line: "Some parts looked like notes — use the AI prompt for those." Warnings shown: first 20, then "and N more".

**Prompt (`byoPrompt.ts`)** adds: output only the questions, no code block, no bold; up to 30 questions for long material; prefer application/priority questions.

**Guards:**
- **DOCX zip-bomb guard (`zipGuard.ts`):** before mammoth runs, the ZIP central directory is read with `DataView`; files are refused if the declared total uncompressed size exceeds **50 MB**, the ratio uncompressed / file size exceeds **100:1**, ZIP64 markers appear, or it is not a ZIP. Directory headers are walked while the signature matches (as the unzip library does) and must match the declared entry count and size. Limitation: a crafted file can under-declare sizes in its directory; mammoth's own inflation is then the only bound (known gap).
- **PDF "scanned" vs "unreadable" (`pdfLines.ts`):** "scanned" only when pdf.js returns no text at all; when text runs exist but their characters can't be mapped (replacement/private-use/control characters, or drawn runs with no characters), the message is "Text in this PDF couldn't be read cleanly — try the original Word/Google Doc." Unreadable characters are stripped from otherwise good text.
- **History after a deep reload:** a launch always opens Today (BUILD-001); if the reloaded entry is deeper than the base, the app moves back to the base entry first (falling back to rewriting the entry after 300 ms if the move never lands), so back on Today leaves the app.
