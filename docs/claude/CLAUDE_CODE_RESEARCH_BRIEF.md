# First Claude Code Execution Brief — Phase 1 Research Only

Use when the owner has placed this workspace in a project folder and approved research file editing.

## Task

Audit the existing Markdown workspace and establish an auditable competitor evidence baseline for Phase 1. **No software implementation.**

## Bounded first batch

1. Inventory every `.md` file; check referenced relative paths and contradictions.
2. Review Phase 1 preliminary candidates in `research/COMPETITIVE_LANDSCAPE.md`.
3. Choose **two categories maximum** for the first research batch, prioritizing accessible official documentation and open-source repositories. Record the rationale; recommend other category batches for later.
4. For each selected category, verify a minimum of three meaningful alternatives if browsing is available (including a free/open-source or manual alternative where relevant).
5. Record factual sources in `research/SOURCE_REGISTER.md`; record each material claim in `research/EVIDENCE_LEDGER.md`; expand category notes in `research/COMPETITIVE_LANDSCAPE.md`.
6. Flag any prior price/feature assertion that is obsolete, uncertain, regional or unsupported; do not silently reproduce it.
7. Identify specific workflow questions, counterevidence and unknowns. Avoid recommending a winner.

## Allowed files

`research/*.md`, `templates/COMPETITOR_PROFILE.md` if needed for formatting, and `decisions/DECISION_LOG.md` to note the batch scope (no decision on product). Preserve all other files unless the owner explicitly approves adjustments.

## Prohibited

No app code, builds, installs, paid tools, account creation, web scraping automation, contacting creators/customers, test execution in other projects, modifying other repos, creating branches, commits, pushing, publishing, uploading private data, or jumping to Phase 2. Do not claim current data if web access is absent.

## Required deliverable

A short readout with exact files changed, competitors verified, new source IDs, strongest evidence/counterevidence, items unable to verify, next recommended bounded batch and 'Phase 1 remains open'.

## Document acceptance criteria

- Every new material feature/price statement has primary-source link or `UNKNOWN` status.
- Price claims include access date, currency, seat/credit/usage limit, annual/monthly terms if applicable.
- Community complaints link to original discussions with date; do not quantify prevalence.
- Counterexamples and already-solved workflows are visible.
- Relative Markdown links resolve and no existing project is pronounced production-ready.
- The workspace remains research-only.
