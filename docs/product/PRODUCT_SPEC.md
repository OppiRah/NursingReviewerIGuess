# Product Spec — H: Nursing student reviewer (v0.1 draft)

- **Date:** 2026-11-14 · **Status:** selected by owner, `DECISION (D-008)` · **Implementation:** not authorized
- **Tags:** S-IDs point to `docs/research/SOURCE_REGISTER.md`; C-/H-IDs point to `docs/research/EVIDENCE_LEDGER.md`. `INFERENCE` = reasoning, not evidence. `UNKNOWN` = not established.

## 1. Problem and audience

- **Audience:** Filipino nursing students reviewing for **course (school) exams**; PNLE later. `DECISION (D-008)`
- **Current behavior:** they make reviewers from course PDFs with ChatGPT or Claude and mostly review by reading; some "hardcore review" by reading only. `REPORTED_USER (secondhand via owner; n unknown)` (C118)
- **Supporting context:** in one university survey, smartphones were the main study device (96%), and students rated "timely feedback" and applying knowledge lower than other benefits of digital platforms (S108, C129). In another survey at the same university, most nursing students used AI tools frequently, ChatGPT most of all (S108, C130). Both are single-institution, self-reported abstracts.
- **Main substitute:** a general chatbot plus rereading. A chatbot can also quiz on request. `INFERENCE` (C127)
- **Hypotheses:** H-H1 (active-recall gap), H-H2 (bring-your-own-AI import), H-H3 (block sharing). Open.

## 2. Positioning

- **Not** "Quizlet for PH nursing". `DECISION (D-008)`
- **Value:** turn **your own** reviewers into a short daily active-recall plan that gets you ready by **your** exam date.
- **Why this differs:**
  - NotebookLM and Knowt generate quizzes and flashcards from user uploads (S101, S102). Whether either plans review backward from an exam date for coursework is not stated in the opened sources. `INFERENCE`; **must be checked in their current apps.**
  - PNLE apps mostly use their own question banks (S104, S105, S107). Tangerine Prep is the exception: it turns user materials into questions (S103, `SECONDARY`).
- **Honest risk:** the core capability already exists (C128); the differentiator is fit and behavior, not features.

## 3. Core learning loop

1. Set an exam date per subject or chapter.
2. Daily session (2–5 min), answered from memory.
3. Rationale shown after each answer.
4. Weak items identified.
5. Spaced, mistake-driven rescheduling.
6. Occasional mixed or "what do you do first" application items.

- **Rule:** the loop must still be useful with the mascot and gamification switched off. `DECISION (D-008)`; also stated in the handoff (S111).
- **Evidence status of the learning science:** `SECONDARY` (publisher summary). The APS summary of Dunlosky et al. 2013 says practice testing and distributed practice received the highest overall utility rating, while summarization, highlighting/underlining and rereading were rated low utility (S113, C135). The full paper was not read. **No learning-outcome claims to users until our own data supports them.**

## 4. Content intake (build order)

- **(a) Structured Q&A import:** deterministic and exact. One sample file is a 72-page Q&A bank with consistent "Answer:" and "Rationale:" fields, likely parseable without AI. `INFERENCE` (C119, n=4 files)
- **(b) "Bring your own AI":** the app shows a copy-paste prompt; the student runs it in their own chatbot and pastes the result back for parsing. **The app makes no AI calls.** Tests H-H2.
- **(c) Built-in AI generation:** later only, with page-level source citations.
- **Every item:** "Report wrong" and "Show source".
- **Why:** text extraction misread a handwritten value in one sample ("WBC <1%" → "WBL 21%"), showing accuracy risk for medical content (C119). Students already report difficulty with AI-generated content (C130).

## 5. v0.1 scope (friends prototype)

- Intake (a) and (b).
- Exam dates per subject or chapter.
- Daily session with spaced repetition. **Open decision: FSRS vs SM-2.**
- Question types: multiple choice with rationale; select-all-that-apply; priority/first-action; flashcard.
- Readiness per chapter.
- Gentle streak with a "freeze".
- Mascot at transitions only.
- Offline-capable.
- Dark mode.

## 6. Out of scope for v0.1

Built-in AI; accounts and sync; block sharing (v0.2; tests H-H3); leaderboards; PNLE mode; payments; widgets. `DECISION (D-008)` scope

## 7. Mascot — the "Momentum Companion"

- **Role:** appears at transitions: session start, recovery after mistakes, meaningful milestones, returning after time away. `DECISION (D-008)`; role described in the handoff (S111).
- **Never:** a guilt machine, a fake medical authority, or always on screen. Stays quiet during focused review.
- **Voice:** encouraging; light humor; never mocks a mistake; Taglish allowed.
- **Precedent:** Duolingo says it designed characters to motivate learners and reflect product qualities (S109, C134). That is a vendor account, not evidence that a mascot improves learning; the handoff itself says mascot learning benefits are not established (S111).

### Notes on the concept image (`assets/mascot-concept-v0.png`, S112)

- **Keep:** the swoopy crest (a strong silhouette), the expression range, and the purple/yellow palette, which avoids generic medical blue.
- **Tension with its own brief** (`INFERENCE`, C137):
  - The brief says no nurse costume and avoid excessive medical symbols (S111). The image adds a stethoscope, a cross-marked book and badge, and a headband (S112).
  - The creature reads close to the "generic cute critter" direction the brief rejected.
  - The sheet names it "The Spark" (concept A), while the chosen direction was Wayfinder + Comeback.
- **Ownership:** the image is ChatGPT-generated. Per a secondary legal summary of the US Copyright Office's January 2025 report, purely AI-generated material is not copyrightable without sufficient human authorship (S110, C136, `SECONDARY`). PH applicability `UNKNOWN — needs qualified review`.
  - **Plan a human-refined or redrawn version before any public launch or branding spend.**
  - The v0 image is fine for the friends prototype. `INFERENCE`
- **Open:** name, final silhouette, icon-size test, contrast check.
- **Verification notes on the handoff's sources:** the two AJRNH 2026 studies (gamification vs critical thinking; procrastination) and the handoff's PNLE Reviewer PH feature list are `UNKNOWN (handoff claim, unverified)` (C131–C133). The Lyceum study matches the handoff's summary (S108, C129).

## 8. Gamification rules

- No guilt messaging; no artificial urgency. `DECISION (D-008)`
- Limited notifications: one daily reminder, at a time the user chooses.
- Rewards tied to learning (mastering weak items, improving delayed recall), not to opens.
- Basis: design choice. The handoff's supporting studies are unverified (C131, C132).

## 9. Success metrics

- **Primary (D-008):** ≥3 of 5 nursing friends use it on ≥3 different days in the week before a school exam, without being reminded by the owner. `DECISION (D-008)`
- **Stop/rethink:** rule not met in the first real exam week, or friends trust their chatbot plus reading more than the app. `DECISION (D-008)`
- **Learning signals:** accuracy on previously missed items; delayed-recall accuracy.
- **Sentiment:** is the mascot helpful, distracting or childish?
- **Do not** use daily opens or streak length alone as success. `DECISION (D-008)`

## 10. Risks

| Risk | Mitigation | Tag |
|---|---|---|
| Accuracy of nursing content | Import-first; "Report wrong"; "Show source" | C119, C130 |
| Copyright of uploaded review-center material | Keep content private per user until sharing has rules | C119; `UNKNOWN — needs qualified review` |
| Privacy (Data Privacy Act) | Education data is sensitive personal information (S100); argues for local-first storage | S096, S099, S100; applicability `UNKNOWN — needs qualified review` |
| iOS distribution cost | Decide platform first (PWA vs Expo) | `INFERENCE` |
| Chatbot "quiz me" as a free substitute | Win on own-material planning, exam-date scheduling, trust | C127 |
| Free upload-to-quiz tools | Same as above; check NotebookLM/Knowt planning features | S101, S102 |
| Handoff studies unverified | Do not cite them as fact | C131–C133 |
| Friends sample is small and biased | Treat results as signals, not proof | `INFERENCE` |

## 11. Open decisions for the owner

1. Platform: installable web app (PWA) vs Expo/React Native.
2. Local-first storage approach.
3. Scheduler algorithm: FSRS vs SM-2.
4. Product name.
5. Mascot name and redraw plan.
6. The "bring your own AI" prompt format.

**Next step:** platform/architecture decision, then a separate first-build authorization. No code until then.
