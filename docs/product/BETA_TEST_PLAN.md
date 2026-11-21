# Beta test plan — friend beta (v0.2.1)

- **Date:** 2026-11-16, Stage 0 revised 2026-11-21 for v0.2.1 (commit `d68affb`). **Owner runs this.** No deploy or contact has been made by any agent.
- **Inputs:** `AUDIT-001.md` (real-device list), `BETA_GUIDE.md` (what friends read), D-008 (success rule).
- **Record results:** copy `STAGE0_RESULTS_TEMPLATE.md` (this folder) to `STAGE0_RESULTS.md` and fill one column per device.

## Stage 0 — owner's own phones (before anyone else)

### Before you start

- **Host at a domain root.** The build uses absolute paths (`/assets/…`, `/sw.js`, scope `/`). Netlify Drop gives a root URL. A sub-folder host (e.g. GitHub Pages `/repo/`) will NOT work without a config change.
- **Build:** `cd app && npm run build`, then drag `app/dist` onto Netlify Drop. Note the URL and the date shown in **Settings → About** (`Version 0.2.1 · built <date>`).
- **Test data: synthetic only** (never a friend's or a review center's file). Put these on each phone (AirDrop, Drive, or email to yourself):
  - `app/e2e/fixtures/synthetic-deck.txt` (5 questions), `mixed-deck.txt` (MCQ, select-all, flashcard), `synthetic-1000.txt` (1,000 questions), `prose-notes.txt` (notes, no questions), `bad-backup.json` (a deliberately broken backup).
  - `app/e2e/.generated/sample.pdf`, `sample.docx`, `scanned.pdf` (created by `npm run test:e2e`; gitignored).
  - **Large PDF (check I5):** on your computer, open `synthetic-1000.txt` and "Print → Save as PDF". That gives 100+ pages of synthetic text.
- **Devices:** iPhone (Safari tab **and** home-screen app; they keep **separate** data), Android (Chrome tab and installed app). A low-end Android if you can borrow one.
- **M** = mandatory before Stage 1. **O** = optional observation. Stop and fix if any **M** fails.

### Backup (A-08)

| # | | Check | Pass looks like |
|---|---|---|---|
| B1 | M | Import `synthetic-deck.txt`, answer a few. **Settings → Export backup** | Message says the phone *may or may not* have saved it; "Did you find…" box appears; "Last confirmed backup: never" |
| B2 | M | Open Files / Downloads and find `reviewer-backup-<date>.json`. Write down where it was | File exists, size > 0. Note the exact folder (iOS and Android differ) |
| B3 | M | Back in the app, tap **Yes, I found the file** | "Backup confirmed"; "Last confirmed backup" shows today; the Today backup reminder is gone |
| B4 | M | Fresh install (or wipe), import a deck, Export, then tap **I can't find it** | "Not counted as a backup"; Today still shows "You haven't saved a backup yet" |
| B5 | M | Export, then close the app fully (swipe away) **before** confirming; reopen | No "Did you find" box; still "never"; reminder still on |
| B6 | M | If **Share backup file** shows: tap it, then **cancel** the share sheet | "Sharing cancelled. Nothing was counted"; still not confirmed |
| B7 | O | Share again and save to Files / Drive; then confirm | The file is in the chosen place |
| B8 | M | **Restore:** Settings → **Wipe all data**, then **Import backup** with the B2 file | Same decks, item count, "seen X of Y" and mistakes count as before the wipe |
| B9 | M | **Import backup** with `bad-backup.json` | Clear error; existing data untouched |
| B10 | O | Restore the B2 file on the *other* phone | Same decks and counts |

### Storage and persistence

| # | | Check | Pass looks like |
|---|---|---|---|
| P1 | M | Install to home screen (iOS: Share → Add to Home Screen; Android: Install). Import, do one full session | Deck saved; Today updates |
| P2 | M | Close fully, reopen | Same data |
| P3 | M | Reopen the next day | Same data; new day's plan |
| P4 | O | Restart the phone, reopen | Same data |
| P5 | M | **Offline:** airplane mode, open the installed app, do a session, paste-import a small deck | All work |
| P6 | M | iPhone: open the same URL in a Safari **tab** | Expect it to be empty (separate storage). Record what you see; this is what a confused friend will see |

### Updates (A-03): needs a second deploy, which only you can approve

A rebuild of the **same commit on the same day is byte-identical**, so the phone sees **no update**. Use a build made on a **later date** (the build date changes the bundle) or a real next version. Deploy it to the **same** Netlify site (Deploys page), not a new Drop URL.

| # | | Check | Pass looks like |
|---|---|---|---|
| U1 | M | Start a session on the installed app, then deploy build 2 and keep answering for 1–2 minutes | No banner, no reload, no lost answer during the session |
| U2 | M | Finish or end the session | "New version available — tap to update" appears. If not within a minute: switch away and back (the app checks at most once an hour), or close the app fully and reopen (the browser checks on launch). Record which one worked |
| U3 | M | Tap it | App reloads once; Settings shows the **new build date**; decks and progress intact |
| U4 | O | Leave the app suspended (not closed) overnight with build 3 deployed; resume | Record whether and when the banner appears |

### Import

| # | | Check | Pass looks like |
|---|---|---|---|
| I1 | M | **Paste** the content of `mixed-deck.txt` | 3 items, all three types, preview matches |
| I2 | M | **File picker** in the installed app: `synthetic-deck.txt`, `sample.pdf`, `sample.docx` | Picker offers them; items appear; no errors |
| I3 | M | First **PDF/Word import while online**, then repeat one offline | Online: works. Offline afterwards: works (the reader was cached). If the very first one is offline: the "needs an internet connection the first time" message, not a crash |
| I4 | M | `scanned.pdf` | Honest "scanned / no text" message; nothing imported |
| I5 | O (M if you have one) | Large PDF on a **low-end Android** | Progress moves; app doesn't go blank or reload; note the seconds |
| I6 | M | **Copy prompt** (from `prose-notes.txt` import) in Safari and the installed app → paste into your chatbot with `prose-notes.txt` → paste the result back | Full prompt pastes; question count matches the chatbot's; spot-check 5 answers against `prose-notes.txt` |

### Study and device behaviour

| # | | Check | Pass looks like |
|---|---|---|---|
| S1 | M | Import `synthetic-1000.txt` with exam date in 3 days | Today: "About N sessions today (10 items each)"; deck line says you may need more sessions; readiness 0%, "seen 0 of 1000" |
| S2 | M | Do one session, answer some wrong on purpose | Readiness counts only right answers (stays low); "Review my mistakes" lists the wrong ones |
| S3 | M | Edit an item: delete a wrong choice, save, reopen | Same choice still marked correct (A-01) |
| S4 | M | Back button / swipe-back during a session | "Leave this session?"; no lost answers |
| S5 | M | Switch to another app mid-session for 5+ minutes, return | Same question on screen, or a clean return to Today; no lost answers |
| S6 | M | **Calendar reminder** on iPhone and Android | One repeating event with an alert; re-download doesn't duplicate |
| S7 | M | **Settings → Copy feedback info**, paste somewhere | Version 0.2.1, counts only, no deck names or question text |
| S8 | O | Dark mode, large text setting, 1-hand use | Readable; buttons reachable |

## Stage 1 — one friend, 3 days

- Pick a friend with an exam or quiz in the next 1–2 weeks. Send the link and `BETA_GUIDE.md`. Help with install once; after that, **don't remind them**.
- Ask on day 3: Did you import your own material? Which way (file or chatbot)? Anything confusing or wrong?
- Go on to stage 2 only if: they imported their own reviewer without you, no wrong-answer bug, no lost data.

## Stage 2 — up to 5 friends, one exam week

- Start about a week before a real school exam. Same guide, no reminders from you.
- Before the exam, ask each for **Copy feedback info** once (shows review counts) and a screenshot of Today.

**Success rule (D-008):** at least **3 of 5** friends use it on **3 or more different days** in the week before the exam, **without being reminded**.
**Rethink if:** the rule is not met, or friends say they trust "chatbot + reading" more than the app.

## What to watch for

- **Import:** which path they use; where they get stuck; chatbot answers that don't parse (ask for a screenshot of the problems list).
- **Workload:** do they open it when "100 items due" shows? Do they finish a session?
- **Trust:** any question they think is marked wrong (Report wrong count; ask what the source said).
- **Readiness:** do they read it as a score? (It is an estimate.)
- **Mascot:** helpful, distracting or childish?
- **iPhone:** anyone who opened it in Safari after installing and "lost" their decks.
- Do not count daily opens or streak length alone as success (D-008).

## Stop conditions — pause the beta and tell everyone

1. **Any wrong-answer bug:** the app marks a correct answer wrong or a wrong one correct, or shows a rationale under the wrong question, when the imported text was right.
2. **Any data loss** not caused by the student deleting the app or clearing browser data.
3. Anything that sends study content off the phone.

On a stop: ask affected friends to **Export backup** first, fix, deploy, confirm the update banner reaches them (version in Settings), then resume.

## After the exam week

Record the result against D-008 in `decisions/DECISION_LOG.md` (new entry): days used per friend, what broke, keep / change / stop.
