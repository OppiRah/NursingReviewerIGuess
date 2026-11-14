# Competitive Landscape — Preliminary Map

**Status:** Seed leads only; **not independently revalidated in this workspace**.  
**As-of context:** Prior ChatGPT research discussion dated 2026-11-07. Some figures discussed previously may already be stale or were sourced indirectly. Do not reuse uncited numbers as verified.  
**Purpose:** Provide an investigation queue, *not* imply a business opportunity.

## A — Developer portfolios and evidence

**Initial competitor leads:** Peerlist; GitHub Pages and GitHub README; DeveloperFolio; GitProfile; no-code site builders; static-site templates.  
**Already addressed:** hosting/profile display, GitHub project listing, templates, custom domains in multiple products.  
**Candidate hypothesis:** Some developers might struggle to document system design, individual contribution and credible verification artifacts in a structured, recruiter-readable format.  
**Counterhypothesis:** README + personal website + GitHub suffice; hiring reviewers may not want yet another dashboard.  
**Evidence needed:** Hiring manager workflow interviews, portfolio owner interviews, employer reading patterns, direct comparison with existing evidence/case-study products.

### Batch 1 kill screen (accessed 2026-11-09)

Hypothesis tested: H005-R1. No hands-on testing was performed.

| Name | Type | Price status | Workflow coverage | S-IDs |
|---|---|---|---|---|
| GitHub Pages | Established host; docs active, no release cycle | UNKNOWN: availability by plan not stated on opened pages | `PARTIAL`: hosts any static site, so a case study can be hand-authored; opened docs describe hosting only, with no structure for problem, decisions, contribution or evidence | S021, S022 |
| Peerlist | Established profile network | UNKNOWN: site returned 403 and pricing was refused by the fetch tool | `PARTIAL` (long-form articles; no structure documented) | S030 |
| GitProfile | Open source | UNKNOWN: repository refused by the fetch tool; licence unverified | `UNKNOWN (unverified: lists GitHub projects)`: demo returned no usable content | S025 |
| Fueler | Newer entrant found by search. Query: "developer portfolio tool structured engineering case studies architecture decisions individual contribution verified evidence for hiring" | Silver free; Gold INR 7999/year; Platinum INR 2499/year, as displayed 2026-11-09; regional price unknown | `UNKNOWN`: "Proof of Work Blocks" exist; structured fields not stated on opened pages | S023, S024 |

GitHub profile README was a seed lead but not assessed, because its docs page was refused. DeveloperFolio was left out to stay within the four-alternative cap.

**Blockers:** None required. GitHub Pages disallows running an online business or SaaS on it (S022), which does not affect a personal portfolio.

**Community evidence (`REPORTED_USER`, no prevalence inferred):** In one 2022 Hacker News thread, individuals report interviewers examining personal projects, and one person reports that nobody paid attention to theirs (S027). Case-study format was not discussed. Reddit was not accessible.

**Counterexample and dissent search:** Searched for structured or verified portfolio tools (query above), and for reviewer behaviour on Hacker News. Dissent found in S027. Search snippets also surfaced an unopened possible counterexample, proofwork.ai, which is `UNKNOWN (unverified: verifies portfolio understanding)`. A vendor blog recommends similar portfolio artifacts (S026), so the content idea is already in circulation; it does not show a product feature.

**Proposed screen result: INCONCLUSIVE.** The one verified alternative is a generic host, and the three alternatives that could decide the screen are `UNKNOWN`.

**Reversal evidence:** Moves to FAILS if Peerlist, Fueler's free tier or an open-source template is verified `YES` on all four case-study elements. Moves to WEAKENED if each is verified `PARTIAL` with a named missing piece. Moves to SURVIVES only if all are reviewed and show neither.

**Portfolio-only note:** May still have portfolio-only value as a publicly inspectable engineering artifact, regardless of commercial outcome.

## B — QA, automated testing and release decisions

**Leads:** Qase, TestRail, Allure Report, ReportPortal, Testmo, GitHub Actions/GitLab CI, Playwright HTML report, Checkly (adjacent).  
**Already addressed:** test management, result history, flaky indicators, failure analytics and quality gates in some tools.  
**Candidate hypothesis:** Tiny teams may struggle to present concise, auditable release decisions using fragmented CI evidence.  
**Counterhypothesis:** Existing CI checks, branch protection, Allure/ReportPortal and Qase already meet the need.  
**Evidence needed:** Actual release checklists and recurring pain from ≤10-person teams, workflow comparisons and cost of switching.

### Batch 2 kill screen (accessed 2026-11-09)

Hypothesis tested: H001-R1. No hands-on testing was performed.

| Name | Type and status | Price status | Workflow coverage | S-IDs |
|---|---|---|---|---|
| GitHub Actions job summaries and deployment reviews | Established, built into GitHub; docs active | Free USD 0; Team USD 4 per user/month, billed monthly, as displayed 2026-11-09; 2,000 and 3,000 Actions minutes per month; regional price unknown | `PARTIAL`: summaries can show test results, and reviews capture approve/reject with an optional comment. Gaps: nothing combines them into one record; required reviewers are limited to public repositories below Enterprise; deployment history as documented shows no approver or comment | S032, S033, S034, S035, S036, S037, S038 |
| Allure Report | Open source, Apache-2.0 (Allure 2 repository); latest release not visible | No price; open-source repository. Allure 3 quality gate page states no licence | `PARTIAL` (updated by relay): Allure 3 has a built-in rule-based Quality Gate that fails the run with exit code 1 (S075), and accepted or muted failures need a `comment` (S076). No approver, author or timestamp is documented | S039, S040, S041, S075, S076 |
| Qase | Established test management; docs active | Free $0 (up to 4 users, 2 projects, 2 active runs, 30-day retention); Teams $35 per user/month billed annually or $42 monthly; Enterprise custom; "$" with no currency code; as displayed 2026-11-09 (strategy chat); regional price unknown. Audit logs on Teams and Enterprise only | `PARTIAL`: milestones tie activity to a release, runs get an automatic status with a public report link, and audit logs persist (paid). No approver, rationale or sign-off on pages read; quality gate not mentioned on the pricing page | S042, S043, S044, S045, S073, S078 |
| TestCollab | Smaller vendor found by search. Query: "release sign-off record go/no-go test results approver small team tool CI release readiness" | Elite (includes Builds & Releases) USD 39 per user/month billed yearly or USD 45 monthly, as displayed 2026-11-09; regional price unknown | `PARTIAL`: computed GO/NO-GO verdict from thresholds, for release managers and product owners. No approver or written rationale described | S046, S047 |

ReportPortal and Testmo were seed leads but were not assessed: their sites were refused or reset (see relay list in SOURCE_REGISTER). They were left out of the count to stay within the four-alternative cap.

**Blockers:** None required.

**Community evidence (`REPORTED_USER`, no prevalence inferred):** One 2022 thread has a safety-critical team using Polarion for requirement-to-test links and another team blocking merges unless tests prove acceptance criteria (S048). One 2023 thread has a person reporting no QA team and daily continuous deployment (S049). Neither discusses a release-decision record. Reddit was not accessible.

**Counterexample and dissent search:** Searched for release sign-off tools (query above) and Hacker News for small-team shipping decisions. TestCollab is the closest counterexample. S049 is dissent: a team reports shipping daily without QA and doesn't mention needing a record.

**Proposed screen result: WEAKENED (provisional).** Three verified `PARTIAL` alternatives each have a specific gap: no combined record with named approver and rationale. A free built-in option is limited to public repositories for approvals. Three seed tools remain unread.

**Reversal evidence:** Moves to FAILS if Allure, ReportPortal or GitHub is verified to produce a free combined record with tested, failed and skipped items, approver and rationale. Moves toward SURVIVES only if relay pages and a hands-on check show none does so. Interviews showing teams don't want such a record would stop it regardless.

**Portfolio-only note:** May still have portfolio-only value as a CI-evidence normalization and audit-trail exercise.

### Batch 3 relay update (recorded 2026-11-14; pages opened by strategy chat on 2026-11-09)

- GitHub's environments page confirms protection rules such as required reviewers are public-repository-only on Free, Pro and Team. It doesn't say what is recorded on approval, which is consistent with S034 (S074).
- ReportPortal's quality gate sends Passed/Failed to CI/CD and needs a managed services subscription. No approver or rationale record is mentioned (S077). ReportPortal pricing and Testmo: closed — not pursued (owner decision 2026-11-09).
- *Strategy read (`INFERENCE`, C084):* free Allure 3 already gives a rule-based gate plus accepted failures with stated reasons. Because those rules live in a config file, git history could supply who and when. What's left of B looks like assembling and documenting a release record, not a missing capability.
- **Screen result unchanged: WEAKENED (provisional), with a narrow gap.**

## C — Construction quotation and customer approval

**Leads:** Joist, Jobber, Houzz Pro, Contractor Foreman, Invoice Ninja, Odoo, local Philippine invoicing/contractor products, Excel/Google Sheets/Facebook Messenger/Viber/WhatsApp.  
**Already addressed:** quotations, estimates, invoicing, customer and job management, change orders in multiple commercial tools.  
**Candidate hypothesis:** Small Philippine contractors may need lightweight, low-friction revision/approval trails compatible with their messaging and paper/PDF workflows.  
**Counterhypothesis:** Their current spreadsheets and messages are good enough, or local tools solve it affordably.  
**Evidence needed:** Identify local incumbents; interview estimators/owners about revisions, approvals, lost inquiries, legal/tax document expectations and current spend.

### Batch 3 kill screen (accessed 2026-11-14)

Hypothesis tested: H002-R1 (strategist wording, refining H002). No hands-on testing was performed. Coverage columns: **Rev** = quote revision history; **Appr** = client approval or e-sign; **Share** = sharing by link or PDF.

| Name | Type, status, target user | Price (plan, currency, period, date); PHP / PH availability | Rev | Appr | Share | Local payments | S-IDs |
|---|---|---|---|---|---|---|---|
| Joist | Established global; contractors | Basics, Pro, Elite, Run. Extracted strings: Basics "$12 $10 $8.34 /mo", Elite "$32 $32 $26.67 /mo" (introductory 30% off), Run "$100 $100 $70 $58.33 /mo"; annual billing "includes 2 months free". Which figure is monthly vs annual is ambiguous in the text. Currency shown only as "$". No free plan; 14-day trial. As displayed 2026-11-14. PHP and PH availability: not stated (`UNKNOWN`) | `UNKNOWN`: not stated on pricing or home pages | `YES` (paid; tier not visible): "In app digital signatures"; change orders on Elite | `UNKNOWN`: "Send via email" only | None documented: credit, debit, bank transfer, PayPal | S081, S082 |
| Jobber | Established global; home service businesses | USD (stated): Core $49/mo no commitment, $39/mo on a 1-year commitment, $29/mo billed annually; Plus up to $499/mo. 14-day trial. As displayed 2026-11-14 (page modified 2026-11-04). PHP not stated; card processing "Available in the US, Canada & UK" | `UNKNOWN`: "request changes" exists, no versioning described | `YES` (paid): approve, request changes and pay a deposit in the client hub; "signature approvals" | `PARTIAL`: online client hub; PDFs attach to quotes; a share link not stated | None documented; processing limited to US/CA/UK | S083, S084 |
| Invoice Ninja | **Source-available (Elastic License), not open-source**; self-hosting offered (S097, strategist update 2026-11-14). Hosted plans; small businesses and freelancers | Free "$0" forever, 5 clients; Ninja Pro "$ 14"/month billed monthly or $140/year; Enterprise from "$ 18"/month. Currency shown only as "$". As displayed 2026-11-14. White-label license "$40 per year", currency not stated (S097). PHP and PH availability: not stated (`UNKNOWN`) | `PARTIAL` (strategist update): History tab records quote-total changes and who made them; Activity tab lists every action; no line-item version snapshots (S098) | `YES` (strategist update; plan availability not stated): client clicks Approve in the portal, giving "a timestamped record of their agreement" (S098) | `PARTIAL`: client portal on all plans; PDF/link not stated on pages read | None on pages read: Stripe, PayPal, Square, GoCardless, Authorize.net, Mollie "and many more"; full list `UNKNOWN` | S085, S086, S097, S098 |
| BuildMark | **Philippine-targeted, PHP-priced.** Found by search. Query: "Philippine made app contractor quotation estimate software peso". For "small construction companies in the Philippines"; no company name or address; email contact only; live status unclear | ₱7,500/month (first 10 customers, 3 months free), ₱10,000/month standard, ₱100,000/year; unlimited users. "Priced in Philippine Pesos". As displayed 2026-11-14 | `YES`: "Every quote version is saved"; one-click revision | `UNKNOWN`: approval described only as an internal status; no client e-acceptance on the homepage | `PARTIAL`: branded PDF; link sharing not stated | None documented (GCash, Maya absent); claims "BIR Electronic Invoicing" (vendor claim, unverified) | S087 |
| Xero (PH site) | Established global accounting; small businesses | **USD on the PH page:** "Prices are in USD." Lite $7, Starter $32, Standard $54, Premium $82 per month, auto-renew monthly; 80% off for 3 months for Philippine customers with a code (Lite $1.40). Quotes on all plans; 30-day trial. As displayed 2026-11-14. PHP pricing: no | `PARTIAL`: shows if a quote was "revised"; no version history named | `YES` (paid): accept or decline online with comments | `YES`: "Email your customers a PDF, or a link to their online quote" | None documented: card, Apple Pay, Google Pay, direct debit via Stripe | S088, S089 |

Houzz Pro was a seed lead but was not assessed, to stay within the five-alternative cap. A second PH lead, Vestimate (seen in search results as Philippine construction estimating software), returned HTTP 403 and is in the relay list. The required Philippine-based or PHP-priced alternative **was found** (BuildMark).

**Blockers (facts only; no legal conclusions; applicability `UNKNOWN — needs qualified review`):** No verified rule makes a quote-and-approval workflow infeasible. Opened BIR texts don't mention quotations (C106). Invoice-issuing software does face registration or accreditation duties (see "Philippine context (Batch 3)").

**Community evidence (`REPORTED_USER`):** None accessible. Reddit refused the fetch tool. Three searches found no first-person contractor accounts: "reddit Philippines contractor renovation quotation client revisions Viber Messenger", "site:reddit.com Philippines contractor quotation …", and "pinoyexchange contractor quotation client nagbago revised quotation renovation business forum". Results were law-firm commentary, templates and foreign forums, none opened. No prevalence, pain or willingness to pay is established (C099).

**Counterexample and dissent search:** Searched for Philippine and PHP-priced quoting tools (query above) and quote-approval features. Xero (approval, link sharing and revised status at USD 7/month) and BuildMark (saved quote versions, PHP-priced) are the strongest counterexamples. Each covers a different half of the hypothesis. Invoice Ninja's free tier is the most likely free counterexample but is unverified. No first-person dissent was found; the counterhypothesis ("messages and spreadsheets are good enough") is untested.

**Proposed screen result: WEAKENED (provisional).** Client approval and link/PDF sharing are verified `YES` only in paid tools at verified prices (Xero, Jobber). A quote revision trail is verified only in a PHP-priced local tool at ₱7,500–10,000/month. No opened tool verifies both together, and none of the five documents GCash or Maya (C098, `INFERENCE`).

**Strategist update 2026-11-14:** Invoice Ninja (source-available, self-hostable) documents client portal approval with a timestamped record, plus quote activity and total-change history. On capability, the C workflow is largely covered: `PARTIAL`, close to `YES`, since line-item versions aren't documented. Screen result changes from WEAKENED to **WEAKENED — capability largely covered; any remaining case is fit for Philippine contractors (Messenger-first habits, PHP pricing, simplicity, hosting burden), which only Phase 2 evidence can establish.** (S097, S098; C117)

*Correction (2026-11-14):* Invoice Ninja is source-available under the Elastic License, not open-source (S097), so no open-source alternative was verified for C.

**Reversal evidence:** Moves to FAILS if Invoice Ninja's docs show client e-sign approval and quote history on the free or self-hosted tier (C093), or if a free PH tool with both is found. FAILS could also follow from a verified rule making the workflow infeasible. Moves toward SURVIVES only if BuildMark and Invoice Ninja are shown to lack client approval or revision history, and Phase 2 conversations show contractors want a shared trail and would pay. Contractors saying chat history is enough would stop it regardless.

**BIR constraint on product shape (`INFERENCE`, C111):** Opened BIR texts make the invoice the primary sales document. They attach registration or accreditation, demonstrations, sworn statements and re-accreditation duties to software that issues invoices or receipts, and RR 26-2025 sets a December 31, 2026 e-invoicing deadline for users of invoicing software. A quote-and-approval-only tool that leaves invoicing to the client's existing system would probably stay outside that regime. Whether quotations are regulated is `UNKNOWN`, and applicability is `UNKNOWN — needs qualified review`.

**Portfolio-only note:** May still have portfolio-only value as a quote-revision and approval-trail exercise, possibly informed by BuildTrack domain knowledge; that reuse is unverified, as PROJECT_INVENTORY notes.

## D — ShortsLab / gaming clip workflow

**Leads:** OpusClip, Vizard, Eklipse, StreamLadder, Crossclip, Auto-Editor, FFmpeg, local editors and NLEs.  
**Already addressed:** highlight candidate generation, auto captions, reframing, local cuts, some publishing/review workflows.  
**Candidate hypothesis:** Editors spend excess time screening false-positive candidates and managing rights/approval through publishing.  
**Counterhypothesis:** Mature tools already solve the workflow; low-quality source detection is hard and GPU/API costs remove viability.  
**Evidence needed:** Time-on-task, acceptance rate on creator-authorized footage, pricing per usable clip, editing and copyright policy review.

### Batch 2 kill screen (accessed 2026-11-09)

Hypothesis tested: H003-R1. No hands-on testing was performed.

| Name | Type and status | Price status and processing allowance | Workflow coverage | S-IDs |
|---|---|---|---|---|
| OpusClip | Established hosted AI clipping; Twitch listed as a source | Free "$0", 60 min/month; Starter "$15/mo", 150 min/month; Pro "$29/mo", 300 min/month (or 3,600/year on annual); Business custom. Monthly, as displayed 2026-11-09. Currency shown only as "$"; annual price not read; minutes per credit not stated | `PARTIAL`: virality score, in-app editing, and selecting clips before publishing. Gaps: owner and member roles only, team chat/notes not supported, no approval step on pages read | S050, S051, S052, S053, S072 |
| Eklipse | Established, for Twitch, Kick and YouTube streamers | Premium "$24.99 per month", Premium Pro "$39.99 per month", as displayed 2026-11-09. Currency shown only as "$". Processing allowance `UNKNOWN` (closed — not pursued). **No free clipping tier:** a free account gets one AI scan and preview; producing and exporting needs Premium (S079, updated 2026-08-30; page title "Free Plan vs Premium" conflicts with the body) | `PARTIAL`: documents a review step and a queue of "the clips you approve" (paid only); one-user flow, with multiple reviewers not documented and efficiency not measured | S054, S079 |
| StreamLadder | Established (seed lead) | `UNKNOWN — pending relay` | `UNKNOWN — pending relay` | none — pending relay |
| Auto-Editor | Open source, Unlicense; latest release and platforms not visible | No price; open-source repository; local processing, so no plan allowance | `PARTIAL`: free first-pass cuts by loudness or motion with export to editing software. Highlight selection not stated. Docs refused and issues not searched | S055 |

**Blocker findings (facts only, no legal conclusions):**
- Twitch's API documents Get Clips Download with an editor or channel clips scope, returning 403 for a user who isn't an editor for the broadcaster, with temporary links and 100 requests per minute (S056). Get Videos was not read.
- Twitch terms, developer agreement and clip help, and YouTube terms and API policies are `UNKNOWN — pending relay`. **This required check is incomplete**, including rules on third-party clipping of another creator's content.
- YouTube's help says credit or non-monetization doesn't by itself give rights, and only courts determine fair use (S057). It doesn't address creator clipping specifically.
- OpusClip lists Twitch as a source and makes no rights statement on that page (S053).

**Community evidence (`REPORTED_USER`, no prevalence inferred):** Individual October 2026 Trustpilot reviewers report decent clip suggestions alongside lost free-tier progress, repeated credit purchases, and expired credits (S059). No first-person report of time spent screening clips was found. A third-party review repeats a ~80-90% Eklipse accuracy figure as "rough community consensus" (`SECONDARY`, S058); that isn't a measurement. Reddit was not accessible.

**Counterexample and dissent search:** Searched for AI clipping experience, OpusClip reviews and Hacker News threads. Eklipse's documented approve queue is the counterexample to "lack a review step". Satisfied voices appear in S059.

**Proposed screen result: WEAKENED (provisional).** A review/approve step is documented only with a paid tool at a verified price, and other tools are `PARTIAL` with named gaps. The platform-terms check could still move this to FAILS.

**Reversal evidence:** Moves to FAILS if the Twitch or YouTube terms make the core workflow infeasible, or if a free tool is verified `YES`. Moves toward SURVIVES only if relay pages and a hands-on test show no efficient review and handoff, and users report the cost in time.

**Budget compatibility (`INFERENCE`):** Incumbents meter processing, at about $5.80–$6.00 per processed hour at full use on OpusClip's monthly plans (S050, S051), which suggests ongoing compute cost. A hosted equivalent probably isn't compatible with a cheap-hosting-only budget; a review-only or local tool might be. Actual compute cost is `UNKNOWN`.

**Portfolio-only note:** May still have portfolio-only value as a local media-pipeline and editorial-review exercise on authorized footage.

### Batch 3 relay update (recorded 2026-11-14; pages opened by strategy chat on 2026-11-09)

- Eklipse's help page says there is no free clipping tier (S079); see the table.
- The Twitch terms of service returned navigation text only, and YouTube's terms were refused (robots disallowed) for the strategy chat as well. **The D platform-terms check stays `UNKNOWN`** (C059). The owner may read these pages manually.
- StreamLadder, Auto-Editor docs, the OpusClip homepage and the other Twitch and YouTube pages: closed — not pursued (owner decision 2026-11-09).
- *Strategy read (`INFERENCE`, C085):* Eklipse contradicts the "no review step" part of the D hypothesis (S054). What remains is cost for small creators and rights.
- **Screen result unchanged: WEAKENED (provisional).**

## E — CALSS / programming similarity investigations

**Leads:** JPlag, Stanford MOSS, Codequiry, Gradescope (adjacent), existing LMS and academic policies.  
**Already addressed:** local code comparison, matched regions, starter-code exclusions and multi-language detection in some free products.  
**Candidate hypothesis:** Instructors might value a transparent case-management trail for reviewing matches and handling student explanations.  
**Counterhypothesis:** Volume too low, institution buys all-in-one LMS, legal/privacy/procurement issues outweigh benefit.  
**Evidence needed:** Instructor qualitative interviews, institutional policy, ownership and licensing audit, sample deidentified workflow.

### Batch 2 kill screen (accessed 2026-11-09)

Hypothesis tested: H004-R1, a problem area only; CALSS code is not reusable. No hands-on testing was performed.

| Name | Type and status | Price status | Workflow coverage | S-IDs |
|---|---|---|---|---|
| JPlag | Open source, GPL-3.0; local; latest release v6.3.0 (year not shown) | No price; open-source repository | `PARTIAL` (updated by relay): the report viewer offers a distribution diagram, sortable comparison table, clusters, match navigation, run info and session-only anonymization (S080, official wiki). No notes, review status or saved decisions are mentioned; absence in docs is not `NO` | S061, S062, S063, S064, S065, S080 |
| Stanford MOSS | Free service, page updated Oct 27, 2026 | Free, per the page; non-commercial | `UNKNOWN`: the page describes results only, with no case feature stated; no issue tracker was checked. Results are typically deleted after 14 days | S060 |
| Symplicity Advocate | Established case management for student conduct offices | `UNKNOWN`: no price stated; demo only | `PARTIAL`: case management with an Event Log capturing all actions, recommended for academic-integrity case status and sanctions (2017 vendor post). Gaps: office-level buyer, no instructor workflow, and student explanation or appeal not stated | S067, S068 |
| IntegraGuard | Newer entrant found by search. Query: "academic integrity case management software instructor document student explanation outcome code plagiarism workflow tool" | `SECONDARY`: free grant-funded trial for ten institutions; GBP 4,000 setup fee above ten, as reported Oct 2025; billing period not stated | `PARTIAL (SECONDARY only)`: case, evidence and hearing reported as handled in the system; students can file no-contest. No vendor page opened, so not counted toward the result | S066 |

Codequiry and Gradescope were seed leads but were not assessed: their sites were refused or returned 403 (see relay list in SOURCE_REGISTER). They were left out of the count to stay within the four-alternative cap. Philippine privacy law is left to Batch 3.

**Blocker findings (facts only, no legal conclusions):**
- MOSS's page was updated Oct 27, 2026, and shows no outage notice. Anyone may get an account; "Moss is for non-commercial use", with commercial inquiries directed to Similix (S060). The submission server was not tested.
- JPlag is GPL-3.0. The licence has no separate commercial-use term, and section 4 allows charging for conveyed copies (S062). Obligations for distributing combined works were not assessed.
- MOSS results are reachable by anyone holding the result URL (S060), which matters for student code.

**Community evidence (`REPORTED_USER`, no prevalence inferred):** An instructor reports handling 15+ cases by email with the Dean's permission and disputes in the office, with commenters disputing the instructor's conclusion (S070, 2011). One 2019 thread has a commenter wanting "a human in the loop", another reporting a ~50% match treated as plagiarism, and a viva used as an alternative (S071). A 2017 thread has one contested case going to court and a satisfied account of peer-assessment scaling (S069). Reddit was not accessible.

**Counterexample and dissent search:** Searched for academic-integrity case management and instructor MOSS follow-up. Advocate and IntegraGuard are counterexamples at institution level. Dissent is in S069 to S071: some people prefer vivas or peer assessment rather than a tracking tool.

**Proposed screen result: WEAKENED (provisional).** An established tool is verified `PARTIAL`, with the specific gap that it serves conduct offices and doesn't document an instructor-level record or student explanation. Codequiry and Gradescope remain unread.

**Reversal evidence:** Moves to FAILS if Codequiry, Gradescope or an LMS is verified `YES` free or built in, or if institutions must use a mandated system that leaves no room for instructor records. Moves toward SURVIVES only if those are reviewed and show neither. Note that Advocate's price and instructor access are `UNKNOWN`.

**Portfolio-only note:** May still have portfolio-only value as a case-record and auditable-workflow design exercise, built without CALSS code.

### Batch 3 relay update (recorded 2026-11-14; pages opened by strategy chat on 2026-11-09)

- JPlag's report viewer is documented in the official wiki (S080); see the table. The docs site at jplag.github.io returned only a JavaScript-required notice and supports no claims.
- Codequiry, Gradescope and the institutional pages: closed — not pursued (owner decision 2026-11-09).
- Philippine privacy law facts are now in "Philippine context (Batch 3)" below. Applicability is `UNKNOWN — needs qualified review`.
- *Strategy read (`INFERENCE`, C086):* the instructor-level record of what happened after a match remains undocumented in JPlag and MOSS. MOSS results are typically deleted after 14 days (S060), and institutional conduct systems exist (S067, S068).
- **Screen result unchanged: WEAKENED (provisional).**

## F — Jairus / desktop voice tasks

**Leads:** VoiceAttack, Talon Voice, Home Assistant Assist, Windows Voice Access, local speech assistants.  
**Already addressed:** voice commands, app/OS control, offline/private processing in some tools.  
**Candidate hypothesis:** A very narrow hands-free workflow could be significantly more reliable or accessible.  
**Counterhypothesis:** incumbents/platform-native tools are more reliable and available with little setup.  
**Evidence needed:** Specific target user, repeated task, latency/accuracy evaluation, permissions and support cost.

### Batch 1 kill screen (accessed 2026-11-09)

Hypothesis tested: H006. No hands-on testing was performed.

| Name | Type | Price status | Workflow coverage | S-IDs |
|---|---|---|---|---|
| Windows Voice Access | Built-in, Windows 11 22H2 and later | No separate price stated; built into listed Windows versions | `YES`: open and switch apps, window control, click, mouse grid, dictation, key presses | S006, S007, S008 |
| VoiceAttack | Established paid utility, v2.2; release date not shown | Registration key USD 10.00; billing period not stated in words, with free 2.x maintenance updates; trial one profile and twenty commands; regional price unknown | `YES`: launches and controls apps by phrase; paid after trial | S004, S005 |
| Talon | Established, latest changelog 1.0 on 2026-09-20 | UNKNOWN: base price not stated on opened pages; "Talon+" links to Patreon | `YES`: hands-free input per vendor page; not counted toward FAILS because price is unknown | S001, S002, S003 |
| Scribe | Open source, smaller project found by search. Query: "Windows free open source voice control desktop commands hands-free app active project" | Free per project docs; licence name not stated | `YES`: launches programs, opens files, emulates shortcuts offline | S009 |

Scribe replaced no seed; it fills the open-source slot because Talon's licence terms were not opened.

**Blocker findings:** Voice Access needs Windows 11 22H2 or later and internet for setup, then uses on-device recognition (S006, S007). The set-up page lists English US, UK, India, New Zealand, Canada and Australia. **English (Philippines) and Filipino are not listed** (S007). Microsoft's opened pages conflict on the language list (S006, S007, S008). Recognition quality for Philippine English speakers using a listed locale is `UNKNOWN`.

**Community evidence (`REPORTED_USER`, no prevalence inferred):** One January 2022 Hacker News thread contains reports of unreliable stacks and latency, alongside satisfied Talon-family users (S010). It predates current Voice Access. Reddit was not accessible.

**Counterexample and dissent search:** Searched Hacker News for Talon and Voice Access experiences and the web for free Windows options. Both satisfied and dissatisfied voices were found (S010).

**Proposed screen result: FAILS** on the deliberately broad H006 wording, because a built-in tool and a free open-source tool are each documented as `YES` on Windows. This is a documentation result, not a test of how well either works.

**Reversal evidence:** A named desktop workflow that Voice Access and Scribe demonstrably cannot complete, shown by hands-on test or their docs and issues; or evidence that the Philippine English or Filipino locale gap causes measurable failure for a defined user group.

**Portfolio-only note:** May still have portfolio-only value as a local speech and desktop-integration engineering exercise.

## G — Notification Bridge / Windows–Android events

**Leads:** Microsoft Phone Link, KDE Connect, Sefirah, NectarLink, proprietary OEM solutions.  
**Already addressed:** notifications, file transfer, clipboard and other sync workflows, often for free.  
**Candidate hypothesis:** Specific desktop overlay/user-control needs may be under-served (e.g., highly configurable game/creator workflows).  
**Counterhypothesis:** aesthetic overlay preferences do not justify paid adoption and Android restrictions are not bypassable.  
**Evidence needed:** User task interviews, OEM/version compatibility, measurable reliability and permission requirements.

### Batch 1 kill screen (accessed 2026-11-09)

Hypothesis tested: H007. No hands-on testing was performed.

| Name | Type | Price status | Workflow coverage | S-IDs |
|---|---|---|---|---|
| Microsoft Phone Link | Established, preinstalled on Windows 11 | No price stated; preinstalled on Windows 11 | `PARTIAL`: Android notifications, per-app control and customizable banners are documented; a configurable overlay over full-screen apps is not stated on opened pages, and Windows DND is on by default for games and full screen | S011, S012, S013, S014 |
| KDE Connect (Windows build) | Open source, GPL-2.0+, release 26.08.2 on 2026-10-08 | UNKNOWN: no price stated on opened pages | `PARTIAL`: Windows build and notification sync are documented; receive-side per-app filter and full-screen display are not stated on opened pages. Issue tracker not accessible | S016, S017 |
| Sefirah | Open source | UNKNOWN: repository refused by the fetch tool | `PARTIAL` (notification sync; filtering and full-screen behavior `UNKNOWN`) | S029 |

No newer entrant was added. Query run: "show Android phone notifications as overlay on Windows full screen game per-app filter app". It returned no candidate that matched on review of titles and summaries; none was opened. NectarLink was not checked because it is hosted on github.com, which the fetch tool refused.

**Blocker findings:**
- **Not established:** Android developer documentation on notification-listener access could not be opened (`developer.android.com` and `source.android.com` refused), so this required check is incomplete.
- **Restricted settings:** Google's support page says some settings may be restricted when an app is installed and that the user can allow them on the app's page, with some steps only on Android 13 and up (S015). It does not name notification access.
- **Sensitive notifications:** On Android 15 or later, Phone Link replaces notifications marked sensitive with "Sensitive notification content hidden" (S012). Whether this applies to a new third-party listener is `UNKNOWN`.
- **Windows full-screen behaviour:** Do Not Disturb is set by default to activate during games and full-screen apps, and the conditions are configurable with per-app exceptions (S013, S014). Whether banners draw over exclusive full-screen games with the rule off is not stated.
- No verified restriction makes the core workflow infeasible, but the check is incomplete.

**Community evidence (`REPORTED_USER`, no prevalence inferred):** One 2023 user reports no popups in full-screen games, with a later unconfirmed suggestion to uncheck the DND rules (S018). Another 2023 user reports a full-screen game minimizing on a PC mail notification (S019). A 2023 Hacker News thread has both satisfied KDE Connect users and connection complaints, on non-Windows setups (S020). Reddit was not accessible.

**Counterexample and dissent search:** Searched the web and Hacker News for overlay tools and for gaming use of Phone Link and KDE Connect. No matching overlay tool was opened. Satisfied voices appear in S020.

**Proposed screen result: WEAKENED (provisional).** Two free alternatives are verified `PARTIAL`, each with a specific piece not documented on opened pages. Sefirah and the Android listener documentation remain open and could change this result.

**Reversal evidence:** Moves to FAILS if Sefirah, Phone Link or KDE Connect is verified to show per-app-filtered notifications over full-screen apps, or if Android docs show a new third-party listener is infeasible. Moves toward SURVIVES only if those checks and a hands-on full-screen test show the overlay and filtering are absent.

**Portfolio-only note:** May still have portfolio-only value as a cross-device Android and Windows systems project.

**2026-11-09:** Blocker check: a new third-party listener is feasible (Sefirah is distributed on Google Play); Android 15+ hides sensitive notifications, which limits the product but doesn't block it. (S029, S031)

## H. Nursing student reviewer (school exams first, PNLE later)

Added 2026-11-14 by owner decision (D-006). Hypotheses: H-H1, H-H2, H-H3 (EVIDENCE_LEDGER). No hands-on testing was performed; Claude Code opened none of the sources below.

**Owner-stated context, 2026-11-14 — `REPORTED_USER (secondhand via owner; n unknown)` (C118):** The owner's friends are nursing students focused on school exams now and the PNLE next year. None use a dedicated reviewer app. They make reviewers with ChatGPT or Claude from course PDFs. Few files are ready-made Q&A, and some just "hardcore review" by reading.

**Sample-file observations — `INFERENCE`, n=4 files (C119):** The strategy chat inspected 4 of 8 owner-provided PDFs on 2026-11-14, read-only, and did not copy them. Claude Code did not open them.
- One file is a structured Q&A bank (72 pages, with consistent "Answer:" and "Rationale:" fields), likely parseable without AI.
- Two are clean-text prose reviewers exported from Google Docs, one credited to a classmate, which suggests peer sharing.
- One is review-center slides with handwritten annotations, saved as a phone PDF. Text extraction misread a handwritten value ("WBC <1%" came out as "WBL 21%"). This illustrates accuracy risk for medical content. The material is third-party copyrighted.

**Alternatives (all opened by strategy chat 2026-11-14):**

| Name | Type | Price status | Coverage relevant to H | Evidence | S-IDs |
|---|---|---|---|---|---|
| NotebookLM (app) | Established, generic (Google) | Not stated | Flashcards and quizzes from user sources; topic, difficulty and count customizable; Android and iOS | `VERIFIED_PRIMARY` | S101 |
| Knowt | Established, generic | Says features aren't "locked behind a paywall"; plans not shown | Notes, flashcards and practice tests from uploaded PDFs; iOS and Android | `VERIFIED_PRIMARY` | S102 |
| Tangerine Prep | PNLE-specific, iOS; first release Jun 9, 2026 (per aggregator) | Free start; "Tangerine+" subscription, price not stated | "My Library" turns user materials into questions, flashcards and cheat sheets; AI curator; duels and "Battle Royale" | `SECONDARY` (aggregator; date conflict) | S103 |
| PNLE Reviewer PH | PNLE question bank, iOS | Free; Premium €1.99/month or €17.99/year (Cyprus storefront); PH price not shown | 7,000+ questions, streaks, exam countdown; no upload mentioned | `VERIFIED_PRIMARY` | S104 |
| PassPNLE | PNLE question bank, iOS | $1.99 one-time (storefront not stated) | 1,000+ questions with rationales, offline; no upload or gamification mentioned | `VERIFIED_PRIMARY` | S105 |
| Purrple Academy | PH exam app; CPALE now, NLE "coming soon" | ₱199/month or ₱1,999/year; in-app purchases listed in USD | Cat mascot, streaks, leaderboard with 400+ PH school logos, arcade modes | `VERIFIED_PRIMARY` | S106 |
| Super Tutor | PH NLE reviewer | ₱249/month auto-pay, ₱299 for 30 days, or ₱1,999/year | Its list shows no resource that lets students upload their own notes | `SECONDARY` (competing vendor's blog) | S107 |

**Strategy read (`INFERENCE`, C127):**
- Generic upload-to-quiz is free (NotebookLM, Knowt).
- A PNLE app with uploads and game features already exists (Tangerine Prep).
- Mascot and PH-school leaderboard features already exist locally (Purrple Academy).
- The friends' actual current tool is a general chatbot. A chatbot can also quiz a student on request, so it is the main substitute to beat.

**Proposed screen result: WEAKENED (provisional)** (C128). The capability exists. Any remaining case is fit and behavior: active recall from the student's *own* course reviewers on a phone, accuracy traceable to the source, and sharing within a block. Only Phase 2 conversations can establish this.

**Next step:** owner conversations using `research/interviews/H_INTERVIEW_KIT.md`; kill criteria are in the kit.

## Cross-category note

A repeated possible pain is **what happens after an automated result**: triaging tests, approving quotes, screening clips, investigating code matches. This is an *analysis lens*, not established demand or defensible uniqueness. Some vendors already offer follow-up workflows.

### Philippine context (Batch 3)

Official sources only. This records what each source says. **Applicability to the owner is `UNKNOWN — needs qualified review`.** The BIR items are digests or a flyer, not the full regulations.

| Fact | Affects | S-IDs |
|---|---|---|
| RA 11976 (Ease of Paying Taxes Act) took effect January 22, 2024 and shifted to an invoice system. Micro taxpayers have gross sales below ₱3,000,000; Small taxpayers have ₱3,000,000 to below ₱20,000,000. The invoice threshold is ₱500. The VAT invoice is the sole supporting document for output and input VAT | C, all | S091 |
| RR 7-2024 was issued April 11, 2024, and its invoicing provisions took effect April 27, 2024 | C, all | S090, S092 |
| The invoice "is now the primary evidence for recording sales". Official Receipt, Payment Receipt, Collection Receipt, Billing Statement and Statement of Account are supplementary documents. Issuing one on a sale instead of an invoice is treated as failure to issue an invoice (₱1,000–₱50,000 and 2–4 years' imprisonment, Sec. 264(a)) | C | S092 |
| Accreditation (sworn declaration, system demonstration, tamper-free and activity-log features, re-accreditation on major changes) is required for CRM, POS, subscription-based e-invoicing or e-receipting software, and other software issuing invoices or receipts except CAS. Developers, providers and users must enroll | C, all invoicing tools | S093 |
| A CAS must be registered by the taxpayer using it (no demonstration), with a Joint Sworn Statement when a third-party software provider supplies it | C, all invoicing tools | S094 |
| Listed taxpayers, including users of CAS, CBA "and other invoicing software" and Small-or-larger e-commerce taxpayers (Micro exempted), must issue electronic invoices by December 31, 2026 under RR 11-2025 as amended | C, all | S095 |
| Whether a **quotation** is regulated | C | `UNKNOWN`: not mentioned in opened BIR texts; full RR 7-2024 not read (C106) |
| RA 10173: a processor acts for a controller and "shall comply with all the requirements of this Act". Security duties fall on the controller, scaled to organization size, and the controller must ensure processors implement them and remains accountable for transferred data | C (client data), E (student data), all | S096 |
| NPC registration (notice of 5 Dec 2022 citing Circular 2022-04): data processing systems must be registered if the organization "employs two hundred fifty (250) or more persons", processes "sensitive personal information of one thousand (1,000) or more individuals", or processes data likely to pose a risk to data subjects. Systems "involving automated decision-making or profiling shall, in all instances, be registered." Exemption conditions remain `UNKNOWN` | all | S099 |
| RA 10173 Sec. 3(l)(2): sensitive personal information includes information about an individual's "health, education, genetic or sexual life" | E, all | S100 |
| PCAB license categories for small contractors | C | `UNKNOWN`: PCAB and CIAP pages refused (C109). No market-size figures recorded |

*`INFERENCE` (C116):* For E, student integrity records are likely education-related sensitive personal information (Sec. 3(l)(2)), and a similarity score used in decisions may count as automated decision-making. Both raise privacy obligations; this needs qualified review. (S099, S100)

## Required next revision

Replace broad category statements with dated, source-linked competitor profiles and an explicit 'already solved' matrix. Include genuine dissenting user feedback. Regional pricing and 2026 feature availability must be independently checked. **Do not rank or select a product here.**
