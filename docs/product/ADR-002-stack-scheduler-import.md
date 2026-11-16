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
