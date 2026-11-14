# Product Discovery Workspace

**Status:** Research only / no product selected  
**Owner:** Independent fourth-year Computer Science student, Philippines  
**Workspace inception:** 2026-11-07  
**Primary agents:** Claude (research/product strategy), Claude Code (repository-level research artifacts and later authorized implementation), ChatGPT (optional independent audit).  
**Goal:** Identify **one evidence-supported, narrowly scoped, technically credible software product opportunity** from existing projects or adjacent needs, balancing engineering portfolio value and realistic commercial potential.

## Start here

1. Read `PROJECT_CHARTER.md` (non-negotiable objectives and boundaries).
2. Read `CLAUDE.md` (Claude Code repo operating instructions).
3. Read `claude/MASTER_HANDOFF_TO_CLAUDE.md` and paste its contents into a **separate Claude conversation** for strategy and prompt refinement.
4. Let Claude produce a *reviewable task prompt* for Claude Code. Claude Code should first inventory the files and propose a research plan, not implement an app.
5. Use `research/SOURCE_REGISTER.md` and `research/EVIDENCE_LEDGER.md` to capture original sources and assertions. Source URLs listed as leads are **not verified research findings**.
6. Work through `ROADMAP.md` with explicit owner stage gates.

## Workspace index

| File | Purpose |
|---|---|
| `PROJECT_CHARTER.md` | Why this research exists, success criteria, scope, prohibitions |
| `PROJECT_INVENTORY.md` | Existing codebases, known boundaries, ownership verification |
| `ROADMAP.md` | Five research/decision phases and acceptance gates |
| `CLAUDE.md` | Persistent Claude Code working instructions |
| `claude/MASTER_HANDOFF_TO_CLAUDE.md` | High-context master handoff for Claude strategist |
| `claude/CLAUDE_CODE_RESEARCH_BRIEF.md` | First authorized Claude Code research task |
| `claude/PROMPT_ENGINEERING_CONTRACT.md` | How Claude should construct, scrutinize and delegate prompts |
| `research/COMPETITIVE_LANDSCAPE.md` | Initial map of all seven categories, *provisional* |
| `research/SOURCE_REGISTER.md` | Links for verification, access date, claims and freshness |
| `research/EVIDENCE_LEDGER.md` | Evidence tracking and hypothesis separation |
| `research/RESEARCH_PROTOCOL.md` | How to source, cross-check and assess claims |
| `decisions/OPPORTUNITY_SCORECARD.md` | Multi-criteria decision method with uncertainty |
| `decisions/DECISION_LOG.md` | Decision and reversal history |
| `engineering/ENGINEERING_GUARDRAILS.md` | Security, architecture, operations and deployment constraints |
| `engineering/AGENTIC_WORKFLOW.md` | Safe agentic work loops, verification and review |
| `engineering/TEST_STRATEGY_AND_CI_CD.md` | V3 risk-based tests and CI/CD policy (later; not authorized now) |
| `engineering/VERIFICATION_AND_RELEASE_GATE.md` | V3 release evidence template (later; not an active gate now) |
| `templates/COMPETITOR_PROFILE.md` | Reusable competitor investigation template |
| `templates/INTERVIEW_GUIDE.md` | Problem-first customer interviews and consent |
| `templates/EXPERIMENT_CARD.md` | Cheap validation experiment before building |
| `templates/PHASE_GATE.md` | Approval gate for research-to-build transitions |

## Current status

- **Phase 1:** Initial, *incomplete* competitive scan exists from a prior ChatGPT conversation; it is a list of leads, not a validated report. Much of the price/feature data needs reconfirmation.
- **Phase 2:** Not started. No underserved need confirmed.
- **Phase 3:** Not started. No meaningful opportunity ranking endorsed.
- **Phase 4:** No product selected.
- **Phase 5:** No MVP design or implementation authorized.

## What not to do

Do not create a SaaS boilerplate, database, authentication system, billing integration, LLM agent, landing page, roadmap for an arbitrarily chosen product, or repository connection unless separately approved. This workspace concerns research and decision-making.

## Source hygiene

The previous research summary mentioned products and attributed features, prices, and anecdotal complaints. **Do not cite that conversation as external validation.** Follow links to original pages, record access dates, distinguish current vs historical pricing, and log any gaps. A credible counterexample can eliminate an idea; do not bury negative evidence.

## Completion definition

This project is complete when the owner has either (a) chosen one validated, appropriately scoped opportunity supported by source-backed evidence and a realistic pre-build test, or (b) explicitly decided **not to build yet** because the evidence is inadequate. Both are acceptable results.

## Optional agent skills

See [`engineering/SKILLS_AND_TOOLING_POLICY.md`](engineering/SKILLS_AND_TOOLING_POLICY.md) before using third-party Claude Code skills. Nothing in this workspace preauthorizes an installation, external browser automation, or changes outside this directory.

## V3 update — testing and CI/CD from owner-provided video (2026-11-09)

V3 retains all 21 V2 Markdown files and adds two documents in `engineering/`. It introduces a future engineering quality strategy inspired by the owner's ~126-second video (unit → integration → end-to-end → performance tests inside a CI/CD workflow). Unlike the video soundbite, V3 **does not** claim that this automatically produces production-quality code: tests are selected by actual risk, reported with reproducible evidence, and paired with security, privacy, accessibility, and human release review. Research-only restrictions remain unchanged; no application code, dependencies, browser agent, CI pipeline, cloud account or deployment is authorized.
