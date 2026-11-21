# Stage 0 results — template

Copy this file to `STAGE0_RESULTS.md` (or a phone note) and fill it in while testing. Checks are defined in `BETA_TEST_PLAN.md` → Stage 0. Synthetic files only.

**Result codes:** PASS · FAIL · PARTIAL · N/A (not possible on this device) · NOT RUN

## Setup

| Field | Value |
|---|---|
| Date(s) | |
| Commit / version | `d68affb` / 0.2.1 |
| Build date shown in Settings | |
| URL (root of the site) | |
| Device A | e.g. iPhone __, iOS __, Safari + home-screen app |
| Device B | e.g. Android __, Chrome __, installed app |
| Device C (low-end Android, optional) | |

## Results

Fill one column per device. For any FAIL or PARTIAL, add a line under "Problems".

| # | M/O | Device A | Device B | Device C | Notes (what you saw, seconds, file location) |
|---|---|---|---|---|---|
| B1 Export message, "Did you find" box | M | | | | |
| B2 File found — folder | M | | | | |
| B3 Confirm → reminder gone | M | | | | |
| B4 "I can't find it" → not counted | M | | | | |
| B5 Close before confirming → not counted | M | | | | |
| B6 Share cancelled → not counted | M | | | | |
| B7 Share → saved | O | | | | |
| B8 Wipe + restore → same counts | M | | | | |
| B9 `bad-backup.json` rejected | M | | | | |
| B10 Restore on the other phone | O | | | | |
| P1 Install + session | M | | | | |
| P2 Close / reopen | M | | | | |
| P3 Next day | M | | | | |
| P4 After phone restart | O | | | | |
| P5 Offline session + paste import | M | | | | |
| P6 iPhone Safari tab vs home-screen app | M | | n/a | n/a | |
| U1 No interruption during a session | M | | | | |
| U2 Banner appears — how | M | | | | |
| U3 Tap → new build date, data intact | M | | | | |
| U4 Suspended overnight | O | | | | |
| I1 Paste `mixed-deck.txt` | M | | | | |
| I2 TXT / PDF / DOCX via picker | M | | | | |
| I3 Reader online, then offline | M | | | | |
| I4 `scanned.pdf` message | M | | | | |
| I5 Large PDF (seconds) | O | | | | |
| I6 Copy prompt → chatbot → paste back | M | | | | |
| S1 1,000 items: sessions + outlook + 0% | M | | | | |
| S2 Wrong answers keep readiness low | M | | | | |
| S3 Edit keeps the correct choice | M | | | | |
| S4 Back / swipe-back in a session | M | | | | |
| S5 Switch apps mid-session | M | | | | |
| S6 Calendar reminder | M | | | | |
| S7 Copy feedback info (no content) | M | | | | |
| S8 Dark mode / large text | O | | | | |

## Problems

| # | Device | What happened | Screenshot? | Severity (stop / fix before Stage 1 / later) |
|---|---|---|---|---|
| | | | | |

## Decision

- All **M** checks PASS on at least one iPhone and one Android? yes / no
- Go to Stage 1 (one friend, 3 days)? yes / no · Reason:
