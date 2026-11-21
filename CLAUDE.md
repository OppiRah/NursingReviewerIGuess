# Instructions for Claude Code — Product Discovery Repository

This repository is a **research workspace**, not a product implementation repository. The owner is a fourth-year CS student looking for a credible software opportunity, potentially a desktop/local-first/non-SaaS tool. Selected product: **H, a nursing-student reviewer PWA** (D-008); see `docs/product/PRODUCT_SPEC.md`.

## Read order (just-in-time)

1. Always read `docs/STATUS.md` first. It is the current state and decision summary.
2. Then read only the files the task prompt names. Find anything else on demand with glob/grep.
3. For `docs/research/SOURCE_REGISTER.md` and `docs/research/EVIDENCE_LEDGER.md`, grep by ID or keyword; do not read them whole unless asked.
4. Governance docs (`docs/PROJECT_CHARTER.md`, `docs/ROADMAP.md`, `docs/research/RESEARCH_PROTOCOL.md`, `docs/claude/*`, `docs/engineering/*`) only when the task touches their topic or the prompt asks.

## Session close-out

At the end of every task, update `docs/STATUS.md`: keep it ≤60 lines, replace outdated lines rather than appending, and record the date, decisions and next actions. This replaces re-reading history next session.

## Current authorization

Implementation is authorized only for tasks whose prompt explicitly says so (BUILD-001 onward), within that task's scope. App code lives in `app/`.

You may review and, **when directed**, update markdown research artifacts in *this directory*. Research existing products via your available research/browsing tools **only if available and authorized**. If you cannot browse, do not invent references: create clearly labeled verification queues and tell the owner what access is needed. Never quietly substitute model memory for current verification.

You must not: create app code, scaffolds, APIs, accounts, deployments, DBs, tests for an unselected product, paid services, web scraping jobs, dependencies, CI pipelines, GitHub repos, external contact, or changes outside this workspace. Commits and pushes only per the Git policy below; no GitHub Actions. Do not read neighboring private projects by default.

## Execution protocol

1. Restate task and allowable paths in ≤10 lines.
2. Identify evidence requirements and ambiguity; make a bounded plan.
3. Inspect existing docs and preserve prior content or note corrections.
4. Research: use direct source links, dates, product versions and original community posts.
5. For material claims, attach source IDs pointing to `research/SOURCE_REGISTER.md`.
6. Track counterevidence; mark weak/dubious/dated claims clearly.
7. Make only requested file edits; avoid sweeping rewrites.
8. Verify file links, Markdown organization and consistency; show exact files changed.
9. Deliver succinct findings, unresolved items and suggested next research batch.
10. Stop at the current phase gate and wait for owner approval.

## Claim classification

`VERIFIED_PRIMARY` = directly confirmed in official docs/pricing/source.  
`REPORTED_USER` = first-person experience with link/date, unrepresentative.  
`SECONDARY` = third-party reporting; note publication date.  
`INFERENCE` = defensible reasoning grounded in evidence.  
`HYPOTHESIS` = untested idea.  
`UNKNOWN` = cannot establish.

**Never** turn a `REPORTED_USER` complaint into representative prevalence or willingness to pay. Never write a price without geography, billing cycle and verification date. Never describe competitor weakness without trying to find a feature or workaround that disproves it.

## Quality rules

- No fictional sources, statistics, customer quotes, benchmarks, competitor features or fees.
- No invented details about the owner's repos.
- Prefer current official docs and actual issue threads to SEO aggregator prose.
- Avoid broad claims like 'no one does X', 'unique', 'production-ready', 'fully secure'.
- Keep conclusions reversible and cite evidence IDs.
- Write with direct, analytical clarity, skeptical of own proposals.
- If browsing is unavailable, explicitly note the gap.

## Handoff boundary

Claude in the separate strategy chat may design prompts and investigate product choice. Claude Code is the executor of **owner-approved, scoped tasks**, not an autonomous product founder. Later build instructions must be separately approved and placed in a new implementation plan; this file does not authorize them.

## Third-party skills and reporting

See `engineering/SKILLS_AND_TOOLING_POLICY.md`. No external skill, extension, browser agent, global configuration or installation is approved by default. Before proposing one, identify a concrete failure it fixes and check for conflicting instructions or hooks. Prefer focused prompts and built-in tooling. Use concise outcome → changed files → verification → evidence/uncertainty → next action summaries, without removing detailed source records.

## V3 — Test and CI/CD policy

Read `engineering/TEST_STRATEGY_AND_CI_CD.md` before advising on build verification, and `engineering/VERIFICATION_AND_RELEASE_GATE.md` before proposing a release. **App tests, synthetic test fixtures and browser automation (unit/E2E) are authorized within BUILD tasks (D-011), inside `app/`.** CI workflows still need explicit owner approval; outside BUILD tasks, only documentation/evidence checks are in scope. Later, choose testing layers according to actual risks and architecture; report exact commands and truthful PASS/FAIL/SKIPPED/NOT RUN status. AI-driven exploratory browser actions do not replace deterministic assertions or production-like integration checks. See V3 README notes.

## Git policy

- Remote: `OppiRah/NursingReviewerIGuess` (**public**).
- **Ask first, every time.** After any significant change set, stage it, show `git status --short` and `git diff --cached --stat`, then ask the owner: "Commit and push these changes?" Commit **and** push only on an explicit "yes" in the current session. Never commit or push on your own initiative, even if a task prompt mentions it.
- Keep it minimal: one commit per approved change set and one push. No work-in-progress commits.
- **No AI attribution:** no `Co-Authored-By` trailers, no "Generated with Claude Code" lines, no session links in commits or PRs. The owner is the only author. This rule overrides any default attribution behavior.
- Before every commit, run the secret, path and name scan from the setup task. Never commit `.env*` (except `.env.example`), keys, sample/course files, or `docs/research/interviews/notes/`.
- Never force-push, rewrite history, delete branches, or add workflows until implementation is authorized.
- Paths inside `docs/` are written relative to `docs/`.
