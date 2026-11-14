# Research and Product Decision Roadmap

Progression is gated by evidence and owner authorization, not calendar dates.

## Phase 0 — Workspace setup

Deliverables: readable docs, clear agent instructions, seed source register, explicit non-build boundary.  
**Exit:** Owner can hand off to Claude and Claude Code without ambiguity.

## Phase 1 — Competitive landscape (current phase)

For each candidate category, identify established vendors, newer entrants, open-source alternatives and manual substitutes. Verify current product positioning, use cases, key features, self-hosting options, pricing/free-tier restrictions, target users and practical limitations. Source independent user experiences from Reddit, GitHub issues/discussions, Hacker News, reviews, public demos and local business context. Seek contradictions, not only complaints.

**Artifacts:** Updated `research/COMPETITIVE_LANDSCAPE.md`; profiles based on `templates/COMPETITOR_PROFILE.md`; `SOURCE_REGISTER.md`; `EVIDENCE_LEDGER.md`; a research gaps section.

**Exit:** At least 3 meaningful competitors per serious category including alternatives; every material current factual claim source-backed; unknown prices explicitly unknown; user complaints quoted/summarized with provenance; open contradictions flagged. Owner approves transition to Phase 2.

## Phase 2 — Gap analysis

Turn reported friction into *falsifiable problem hypotheses*. Define user, triggering event, failed workaround, frequency, cost, alternatives, switching friction, market distribution and incumbent response. Conduct interviews or produce interview-ready recruitment plan if access is not authorized.

**Exit:** Distinguish validated problems from hypotheses; reject weak differentiation; identify 2–4 candidates for further investigation, or explicitly none. Owner approves Phase 3.

## Phase 3 — Opportunity comparison

Compare market pain, differentiation evidence, feasibility, existing reuse, distribution, revenue plausibility, competition, support burden, portfolio depth, learning and reachability of prospective users. Avoid precision where evidence is weak. Produce three separate ranked views: engineering portfolio, business potential, balanced.

**Exit:** A decision brief explaining uncertainty, sensitivity and strongest reasons **not** to build each candidate. Owner approves Phase 4.

## Phase 4 — Product selection

Choose **one** customer/problem wedge or choose no-build. Write an ADR-like decision explaining alternatives rejected, evidence, reversibility, ownership, and measurable stop conditions.

**Exit:** Owner explicitly approves the selected problem, target user, commercial mode, and validation experiment. Selection alone is **not** permission to code.

## Phase 5 — Validation and narrow MVP

Plan problem interviews, low-cost tests, pilot outreach *drafts*, clickable prototype only if authorized, concierge/manual service tests, competitive task benchmarks and willingness-to-pay checks. After validation, specify a narrow MVP, architecture, privacy model, ops budget, security boundary and verification plan.

**Exit:** Owner separately authorizes implementation and explicitly defines allowed paths, services, spending, commits/pushes and acceptance criteria.

## Stop conditions

- Interviewees describe a rare or unimportant problem.
- Existing free/cheap products already solve the workflow adequately.
- Buyer cannot be identified or reached.
- Differentiator requires bypassing platform/copyright/privacy protections.
- Solo maintenance burden exceeds owner's capacity.
- Business case depends on speculative AI accuracy or unverified data access.
- No clear reason to switch from spreadsheets / current product.

## Research cycle

Search → collect primary sources → record evidence → compare counterexamples → write hypothesis → attempt disproof → summarize uncertainty → ask owner for gate decision.

## V3 — Engineering verification is a gated design consideration

In Phases 1–3, research whether competitors offer trustworthy evidence, practical testability, observability and reliability; **do not build a testing platform**. During Phase 4, selection does not grant coding permission. During Phase 5, any proposed MVP architecture should include a risk-weighted test and release plan from `engineering/TEST_STRATEGY_AND_CI_CD.md`; only owner-approved implementation may set up a CI pipeline. Release requires an explicit gate and evidence record using `engineering/VERIFICATION_AND_RELEASE_GATE.md` as appropriate. Maintain product-specific thresholds, no universal performance numbers.
