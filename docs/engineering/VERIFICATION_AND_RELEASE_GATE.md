# Verification Evidence and Release Gate — V3

**Future-use template. Not an active release checklist for the research-only workspace.**

## Change identity

- Product / repository / version:
- Owner-approved task and allowed paths:
- Change summary and acceptance criteria:
- Risks, affected data, trust boundaries:
- Reviewed diff / commit IDs (if any):

## Verification record

| Check | Why applicable / why omitted | Exact command and environment | Result (PASS / FAIL / SKIPPED / NOT RUN) | Evidence/artifact | Reviewer |
|---|---|---|---|---|---|
| Static/types/lint | | | NOT RUN | | |
| Unit | | | NOT RUN | | |
| Integration | | | NOT RUN | | |
| E2E / smoke | | | NOT RUN | | |
| Authorization/privacy/security | | | NOT RUN | | |
| Accessibility | | | NOT RUN | | |
| Performance/recovery | | | NOT RUN | | |
| Backup/rollback (where applicable) | | | NOT RUN | | |

**Result rule:** SKIPPED requires rationale; NOT RUN must never be called PASS. Test counts and green checkmarks do not replace reproducible evidence. Include relevant input dataset, test fixture version, configuration, command exit codes, logs without secrets, timestamp and environment.

## Blocking conditions

- Broken accepted core workflow, failing required test, uninvestigated flaky failure masking risk.
- Unauthorized or unintended secrets access, cross-tenant data leakage, loss of user data, unapproved third-party transfer.
- Unapproved deployment, database change, costs or service integrations.
- Missing reliable recovery path for a destructive change.
- Material mismatch between stated requirements and tested behavior.

## Human decision

- [ ] All critical checks applicable to this change passed.
- [ ] Known limitations and skipped checks are documented.
- [ ] Security/privacy concerns reviewed at the appropriate depth.
- [ ] Costs, migrations, monitoring and rollback reviewed when relevant.
- [ ] Owner explicitly approves deployment or release (separate from PR merge).

Decision: HOLD / APPROVED / REJECTED. Date and responsible human: ______.

## Before implementation is permitted

Do not fill this as if a product exists. During Phase 1–4, use document verification in `engineering/TEST_STRATEGY_AND_CI_CD.md`. Creating a GitHub Actions workflow, tests, cloud infrastructure, release process, or GitHub repository still requires separate owner authorization.
