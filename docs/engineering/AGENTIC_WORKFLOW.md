# Agentic Engineering / Verification Loop

AI helps produce research and later code faster; it does not own product decisions or replace proof.

## Research agent loop (authorized now)

**Plan bounded task → gather original evidence → state claim with source/date → search counterexample → update ledger → cross-check contradictions → summarize with uncertainty → stop at gate.**

Use read-only research tools where possible; verify all output links and assumptions. Record unavailable tools and do not simulate browsing.

## Later software development loop (NOT authorized yet)

**Issue + explicit acceptance criteria → minimal design → implementation in approved paths → static checks → unit/integration/e2e tests as appropriate → security/privacy review → manual smoke test → diff review → owner sign-off → release.**

A feature is not complete because an agent says 'tests pass'. Review actual commands, output, scope and failure cases. Tests must be relevant, not inflated counts.

## Claude / Claude Code handoff contract

- Claude: prioritizes research questions, drafts bounded prompts, challenges evidence and reviews reported outputs.
- Claude Code: uses exact owner-authorized paths, gathers source data where possible, edits only allowed files, checks deliverables and reports omissions.
- Owner: approves phase gates, expenses, external integrations, repo access, contacts, commits/pushes, product selection and launch.
- Local LLM (optional): assist with private search/explanation; never substitute its answers for direct verified sources or security review.

## Verification examples for research files

- All source IDs in evidence ledger exist in source register.
- All relative links resolve.
- Every pricing claim includes source, accessed date and billing basis.
- No unqualified 'unique', 'no competitor', 'users want' claims.
- At least one counterexample sought for each proposed gap.
- Every user post is labeled anecdotal unless there is reliable broader evidence.
- No source contains copied private data or API secrets.

## Stop / escalate conditions

Ambiguous authorization; personal/sensitive info; copyrighted media; missing research/browsing capability; cost-bearing external service; git remote action; security flaw; cross-repo access; unsupported legal claim; evidence inconsistent with chosen hypothesis.

## Improvement practice

Use small prompts and review cycles. Let the owner ask Claude to critique Claude Code's findings and, optionally, ChatGPT independently to challenge both. A second AI agreeing is not evidence; only source inspection or reproducible measurement changes confidence.

## V3 — Risk-weighted feedback loop

The proposed development loop is **specify observable behavior → define negative/edge cases → implement narrowly → run deterministic automated checks → inspect real outputs → diagnose failures → update tests as needed → independently review → document evidence**. It supplements, not replaces, the existing research loop. See `TEST_STRATEGY_AND_CI_CD.md`. Do not generate tests merely to increase counts, let AI blindly repair failing tests by weakening assertions, or interpret green CI as production proof. Use the separate `VERIFICATION_AND_RELEASE_GATE.md` only after build authorization.
