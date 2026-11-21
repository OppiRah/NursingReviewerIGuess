# Beta test plan — friend beta (v0.2.0)

- **Date:** 2026-11-16 · **Owner runs this.** No deploy or contact has been made by any agent.
- **Inputs:** `AUDIT-001.md` (real-device list), `BETA_GUIDE.md` (what friends read), D-008 (success rule).

## Stage 0 — owner's own phones (before anyone else)

Deploy `app/dist` (Netlify Drop), then do these in order. Stop and fix if any of 1–5 fails.

| # | Check | Pass looks like |
|---|---|---|
| 1 | **Backup really saves** (iPhone home-screen app, then Android): Export backup | The `.json` is in Files/Downloads; Import backup on the other phone shows the same decks and counts |
| 2 | **Data survives:** install, import a deck, do a session, close fully, reopen next day | Deck and progress still there |
| 3 | **Update arrives:** deploy a second build, open the installed app, wait a minute | "New version available" banner; after tapping, Settings shows the new build date; decks intact |
| 4 | **Copy prompt** in iPhone Safari and in the installed app | Full prompt pastes into ChatGPT |
| 5 | **Full notes loop on a phone:** prompt + real notes → chatbot → paste into Import | Question count matches the chatbot's; 5 answers spot-checked against the notes |
| 6 | **File picker in the installed app:** pick a `.pdf` and a `.docx` | Picker offers them; text appears |
| 7 | **Large PDF on a low-end Android** (100+ text pages) | Progress moves; app doesn't go blank or reload |
| 8 | **Offline:** airplane mode, open the installed app, do a session | Works |
| 9 | **Calendar reminder** on iPhone and Android | One repeating event with an alert; re-download doesn't duplicate |
| 10 | **Back button / swipe-back during a session** | "Leave this session?" dialog; no lost answers |

Also: **Settings → Copy feedback info** pastes a 7-line block with no deck names.

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
