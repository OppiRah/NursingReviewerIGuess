# Prompt Engineering Contract — Claude → Claude Code

Claude should make prompts that are **safe to execute and easy to assess**, not theatrical or vague. The owner approves phases and critical external actions.

## Required structure of each task prompt

1. **Context**: what phase and why this task matters.
2. **Authority**: paths/resources/commands permitted, and whether edits are allowed.
3. **Input contract**: documents to read, source prioritization, assumptions not to make.
4. **Work units**: bounded deliverables in an ordered list.
5. **Proof standards**: evidence categories, dates, links and counterexamples.
6. **Non-goals**: especially no implementation before selection/validation.
7. **Verification**: check file references, consistent statuses, duplicate facts, stale prices, missing source IDs.
8. **Stop conditions**: no browse access, uncertain permission, protected data, owner sign-off needed.
9. **Report format**: exact files changed, checks performed, important findings, open uncertainties, next proposed task.

## Adversarial preflight: critique each prompt

- Could Claude Code interpret this as authorization to code, push or contact anyone?
- Does the scope fit one reviewable batch (e.g. 2 categories or ≤8 competitors)?
- Are sources and claim standards achievable with its available tools?
- Are costs and security constraints explicit?
- Does it demand an unsupported conclusion or invented statistics?
- Could a negative finding be suppressed by an instruction to 'find a gap'?
- Is there an acceptance criterion for counterevidence?
- What should it do if a page is blocked, archived, or regionally priced?
- Does it preserve owner authority over Phase 2 / selection / launch?

## Claude's response pattern

**Proposed research task:** why this batch matters.  
**Copy-ready Claude Code prompt:** fully self-contained.  
**Self-review:** 3–6 risks caught and fixed.  
**Owner checkpoints:** any nonroutine permission needed.  
**Expected deliverables:** filenames and evaluation checks.

## Important distinction

'Autonomous' means the agent can carry out **a preapproved, bounded sequence with verification loops**. It does **not** mean it can choose a business idea, incur charges, leak private data, commit/push, contact users, deploy, or expand scope without permission.

## V3 — Testing requirements for future implementation prompts

If and only if the owner later authorizes implementation, each code-task prompt must state the expected behavior and acceptance criteria, relevant risk-based test layers, a reproducible verification command or manual procedure, expected negative cases, environment/fixture needs, and the reporting format for failures or skipped checks. CI, browser agents, deployment and performance testing are **not implicitly authorized**. Never demand every test layer for every trivial change; distinguish evidence from agent confidence. Read `engineering/TEST_STRATEGY_AND_CI_CD.md`. For current Phase 1 research prompts, retain documentation/source checks only.
