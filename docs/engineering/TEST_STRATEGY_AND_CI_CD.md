# Testing Strategy and CI/CD — V3

**Status:** Policy for future engineering, **not authorization to build, install, deploy, or create CI infrastructure now**. Added 2026-11-09 after reviewing the owner's 126-second video on CI/CD, unit, integration, E2E and performance testing.

## Core principle

A working demo is not a production-quality system. Evidence comes from repeatable tests tied to requirements, measured behavior, and observable operations, not from AI assertions or inflated test counts. Testing reduces risk; it does not prove the absence of bugs, security flaws, or production incidents.

## Stage A — Current research-only repository

No application CI/CD pipeline, Playwright installation, test framework, GitHub Actions workflow, or load test is currently warranted. For each scoped Markdown edit, check:

1. File structure, relative links, headings and template fields.
2. Every substantial external fact is backed by an original, dated source ID; source IDs are valid.
3. Claims, hypotheses and firsthand reports retain their evidence classifications; pricing records include region/billing period/access date.
4. Research conclusions actively search for competitor counterexamples.
5. The workspace contains no secrets, private project data, unsupported market claims or unauthorized app code.
6. Any optional lightweight documentation checks must be read-only or explicitly authorized; do not add tooling simply to claim CI coverage.

A CI job for Markdown may be **proposed** only if research artifacts become frequently edited by multiple contributors and its maintenance cost is justified. Obtain explicit permission before creating workflow files, installing dependencies or connecting remotes.

## Stage B — After one product is selected, validated, and build authorization is granted

Select tests from requirements, risks, and actual architecture. Do **not** impose every test layer on every MVP. Start with the smallest credible suite and expand when failure modes justify it.

| Layer | What to verify | Example | Appropriate trigger |
|---|---|---|---|
| Static/format/type checks | Parseability, style, type contracts, dependency health | TS typecheck, linter, Python type checker | Languages/tooling chosen |
| Unit | Isolated deterministic domain rules and edge cases | Quotation totals, file size validation, similarity threshold interpretation | Pure logic or safety-critical rules exist |
| Integration | Boundaries between real components or controlled substitutes | API + DB transaction, permissions + persistence, ingestion + parser | Components exchange data |
| End-to-end | Few highest-value user paths in a production-like environment | Create/revise/approve quote, upload/view results | Actual GUI/HTTP journey exists |
| Security/privacy | Authz, tenant boundaries, consent, injection, retention, secrets, abuse | Cross-tenant record access denied | Sensitive data, multi-tenancy, network access |
| Performance/reliability | Measured latency, throughput, failure and recovery under representative load | Processing 500 submissions or sustained requests | A performance budget, user expectation or bottleneck is known |
| Accessibility | Keyboard, labels, contrast, focus, screen-reader semantics | Complete quote approval without mouse | User-facing UI exists |

## Practical CI baseline (only when implementation is authorized)

A useful first pipeline is: **checkout → deterministic setup and locked dependencies → formatting/lint + types → unit tests → integration tests (when needed) → small smoke/E2E suite (when needed) → report artifacts → merge gate.**

- PRs must not depend on production credentials or mutate production databases.
- Apply least-privilege CI permissions. Pin trusted actions/dependencies; avoid running untrusted PR code with secrets. Apply timeouts and artifact-retention limits.
- Report the command, environment, tests run/skipped, failures, and results. Do not mask failures with `|| true` or broad retries.
- Separate deployment from passing CI. A green test pipeline does **not** authorize publishing or prove production readiness.
- Deployments, migrations, external integrations, publishing and remote pushes require explicit owner permission. Favor a manual release checklist and rollback plan for a solo-maintained MVP.
- If costly E2E or load tests are needed, schedule them separately and budget resource use.

## E2E and browser-agent policy

Use deterministic Playwright or equivalent browser tests for a small set of high-risk journeys **if the selected product has a web UI**. Prefer stable locators based on roles, labels and test IDs; avoid brittle timing assumptions. Run against controlled test fixtures; reset state between tests; assert resulting behavior including backend state when appropriate.

An AI/browser agent can explore workflows and propose missing scenarios, but **must not** substitute for deterministic regression tests, credential hygiene, authorization checks, or human review. No claim of "every path tested" unless coverage is actually enumerated and measured. Grant explicit approval before adding browser-use, autonomous crawling, external browsing sessions or authenticated account automation.

## Performance policy

Define meaningful service-level objectives **before** choosing tools. Set representative environment, dataset and workload, warm-up protocol, repeated measurements, percentiles where relevant, and pass/fail budgets. Compare with an appropriate baseline and retain raw results. An arbitrary 5-second expectation from an example video is not a universal performance requirement. Avoid load testing third-party or production services without explicit authorization.

## Failure taxonomy and escalation

- Unit failure: reproduce input and expected rule, fix implementation or correct a demonstrably wrong test.
- Integration failure: check contracts, fixtures, DB transaction behavior, migration and network boundaries.
- E2E failure: diagnose UI, backend, environment, selector and test isolation before retrying.
- Flaky test: identify cause, quarantine with a tracked issue only if necessary; do not silently suppress it.
- Security/privacy failure: stop affected rollout; isolate secrets/data and notify owner.
- Performance regression: confirm measurement reproducibility and cost before optimization.
- Unverified or skipped checks: never report them as passing.

## Definition of done for a later code change

Written acceptance criteria, reviewed diff, relevant checks passing with real outputs, critical negative cases, no unauthorized network/production effects, updated documentation, explicit limitations, and owner approval for release. A test count alone is not a completion metric.

## Example candidate-specific risks (not test requirements yet)

- **Portfolio:** untrusted GitHub markdown, OAuth scopes, accessible UI, GitHub rate limits.
- **QA:** CI credential handling, correct aggregation, false green release-readiness, tenant isolation.
- **BuildTrack:** quote math, immutable revision history, approval authorization, communication failure and duplicate requests.
- **ShortsLab:** valid licensed input, determinism, corrupted media, output correctness, CPU/GPU cost, export failures.
- **CALSS:** false-positive handling, reproducible evidence, parser robustness, permissions, large datasets.
- **Jairus:** confirmation before destructive tools, unauthorized device commands, transcription errors, transport security.
- **Notification Bridge:** consent, encrypted pairing, duplicates, missed notifications, Android background restrictions.

## Where agentic engineering helps

Claude designs a bounded task with acceptance criteria. Claude Code implements the smallest authorized change, runs the relevant checks, inspects failures, repairs root causes, and reports commands and outcomes. The owner or independent reviewer challenges assumptions and authorizes consequential actions. AI may propose tests, but assertions must derive from externally visible requirements and verified expected behavior—not merely mirror the implementation.

## V3 source note

The owner supplied `1000108972.mp4` (~126s), presenting CI/CD → unit → integration → E2E → performance tests as a path from vibe coding to better engineering. The video was reviewed visually. This document adopts the valid layered-testing principle while rejecting blanket claims of production quality or universal testing requirements. This is a workflow reference, not external verification of an implementation or current vendor claim.
