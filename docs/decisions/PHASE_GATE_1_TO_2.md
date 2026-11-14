# Phase Gate — Phase 1 (Competitive landscape) → Phase 2 (Gap analysis)

- **Date:** 2026-11-14
- **Owner approval:** Granted 2026-11-14 — see D-006

## Phase 1 deliverables

The kill screen was run across all seven categories in Batches 1–3 (D-001 to D-004), using about 100 registered sources. That covered the competitive landscape, the source register, the evidence ledger and a Philippine context section. Full competitor profiles were deliberately not written; this method replaced the original "≥3 profiles per category" exit criterion.

## Screen results and recommended Phase 2 treatment

| Cat. | Commercial screen | Key evidence | Recommended treatment |
|---|---|---|---|
| F Voice | FAILS | Voice Access and Scribe cover the broad workflow free (S006, S007, S009) | Closed commercially; portfolio only |
| G Notifications | Deprioritized | Free Sefirah (GPL-3.0, Google Play), Phone Link, KDE Connect; Windows DND on by default in full screen (S029, S011, S013, S014) | Closed commercially; portfolio only |
| B QA / release record | WEAKENED (narrow gap) | Free Allure 3 quality gate plus resolutions with required comments; ReportPortal gates paid; TestCollab paid GO/NO-GO (S075, S076, S077, S046, S047) | **Park.** The remaining gap looks like a template or assembly of existing pieces. Strong portfolio candidate. |
| D Clipping | WEAKENED | Eklipse approve queue, no free clipping tier; metered processing around USD 6/processed hour on OpusClip; Twitch/YouTube terms UNKNOWN (S054, S079, S050, S051) | **Park.** Re-open only if the owner reads the platform terms and wants a local, own-content tool. |
| A Portfolio | INCONCLUSIVE → demand question | Peerlist, Fueler and GitHub Pages cover publishing; the question is whether reviewers value structure (S030, S021, S022, S023, S024) | **Carry (light):** ask 3–5 people who review junior developers |
| E Instructor case record | WEAKENED (clearest open gap) | JPlag viewer documents no notes or saved decisions; MOSS results deleted after about 14 days; conduct-office systems exist (Advocate) (S080, S060, S067, S068) | **Carry.** Reachable users (instructors). CALSS code is not reusable (co-owned). Privacy: education data is sensitive personal information (RA 10173 §3(l)(2)). Buyer is likely the institution. |
| C PH contractor quote/approval trail | WEAKENED (capability largely covered) | Invoice Ninja client approval plus activity and total history (source-available); BuildMark PH ₱7,500–10,000/mo; Jobber USD 29–49/mo; no GCash/Maya documented; BIR duties attach to invoicing software (S097, S098, S087, S083, S084, S092, S093, S094, S095) | **Carry.** The question is fit and adoption, not capability. Product shape would stay quote-and-approval-only. Reachability UNKNOWN. |

## Counterevidence (strongest against carrying anything forward)

- No category has first-person user evidence of a frequent, costly problem. Community sources were mostly inaccessible or anecdotal.
- C: capability exists free/source-available; "Messenger is enough" is untested and plausible.
- E: institutions buy, not instructors; procurement is slow; the privacy obligations are real.
- A: users rarely pay, and reviewers may not care about structure.

## Unresolved high-risk assumptions

1. The owner can reach 5+ people per carried segment without cold outreach. **Not yet established.**
2. A fit or usability differentiator (C) is enough to make people switch. Phase 2 must test whether current workarounds actually fail.
3. Instructors experience the post-match record problem often enough to care (E).
4. Legal applicability (BIR, NPC) needs qualified review before any build. It is not needed for interviews.

## Proposed Phase 2 bounded tasks

1. **Owner (no AI):** a reachability list. For C, E and A, count the named people you could talk to within 2 weeks through your own network. Record counts and relationship type only, no names or personal data. If a segment has fewer than 3, it is a stop signal for that segment.
2. **Strategy chat:** one interview kit per carried segment, adapted from `templates/INTERVIEW_GUIDE.md`. Each kit has a falsifiable problem hypothesis (user, trigger, current workaround, frequency, cost, switching friction), 8–10 questions about past behavior with no pitching, and kill criteria written before any interview.
3. **Owner, if outreach is approved:** 3–5 conversations per carried segment, within the owner's own network only.
4. **Claude Code:** record anonymized interview notes as evidence (`REPORTED_USER`, interview-sourced), and update hypotheses to validated, weakened or rejected.
5. **Optional, owner override of D-003:** a lightweight OJT/school problem log. The owner writes down repeated, observed problems in plain words; ideas are not brainstormed by AI. A check on employer IP ownership comes first.

## Paths the agent may read or change (Phase 2)

`research/*`, `decisions/DECISION_LOG.md`, and a new `research/interviews/` folder for anonymized notes only.

## Permitted external actions and spending

None by agents. Outreach is by the owner, within their own network, and only if approved below. No spending.

## Prohibited

Agent contact with anyone; storing names, contact details, recordings or student records; recording without explicit consent; implementation, prototypes, landing pages or pitching a product during interviews.

## Review and acceptance criteria

Each interview note shows date, segment, relationship type and anonymized ID; quotes are separated from interpretation. Each hypothesis is updated with the count of supporting versus contradicting conversations, and no conclusion rests on a single conversation.

## Stop conditions

- A segment can't reach 3 people.
- Most interviewees describe the problem as rare or already solved (for example, "chat history is enough").
- No interviewee reports spending time or money on a workaround.
- The owner's weekly capacity drops below what interviews need.

## Decision

**Decision:** Approved (a) by owner 2026-11-14, with candidate H added — see D-006. Options:
- (a) Approve Phase 2 as proposed.
- (b) Approve without outreach: interview kits and recruitment plan only.
- (c) Revise the carried set.
- (d) Defer.

> Approval to proceed with research is not approval to implement, publish, spend money, or commit/push.
