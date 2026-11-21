# ADR-001 — Platform and local storage for v0.1

- **Status:** APPROVED with amendments (D-010); amendments at the end of this file. Proposed in D-009.
- **Date:** 2026-11-14 · **Product:** H (D-008) · **Spec:** product/PRODUCT_SPEC.md §5, §10, §11
- **Tags:** S-IDs → research/SOURCE_REGISTER.md; C-IDs → research/EVIDENCE_LEDGER.md

## 1. Context and constraints

- Runs on Android **and** iPhone; friends install it with little friction.
- Budget: cheap hosting and a domain only.
- Offline-capable, local-first storage (privacy; no backend cost). Education data is sensitive personal information (S100).
- One daily reminder notification, the app's habit trigger.
- Imports pasted text and structured Q&A files.
- Solo developer, about 7–10 hrs/week; knows TypeScript, Astro and Python.
- Explainable in technical interviews; testable with automated tests later.

## 2. Options

### A. Installable web app (PWA): TypeScript, IndexedDB via a small wrapper, service worker, static hosting

- **Cost:** no store fees; static hosting fits the budget. A daily reminder on iOS needs Web Push sent from a server (C146), so a small scheduled sender is needed; its free-tier cost is `UNKNOWN`.
- **Install, Android:** installable from the browser; needs a manifest and HTTPS (S116).
- **Install, iOS:** iOS 16.4+ installs from the Share menu in Safari, Chrome, Edge, Firefox and Orion; no install prompt API, so friends follow manual steps (S116, C139).
- **Reminders:** Web Push works on iOS 16.4+ only for Home Screen web apps, with permission asked from a user tap (S114, C138). Local scheduled web notifications are not documented in the opened sources (C146).
- **Offline/storage:** WebKit storage is best-effort and evictable; persist() is granted by heuristics such as running as a Home Screen web app (S115, C140). Chromium auto-grants persistence to installed or notification-permitted sites (S120, C141). Export/backup is mandatory (§5).
- **Import:** paste and file input are standard web features (`INFERENCE`).
- **Developer speed:** highest; one TypeScript codebase in the owner's existing stack (`INFERENCE`).
- **Testability:** unit tests plus browser end-to-end tests run in CI without devices (`INFERENCE`).
- **Interview value:** service worker, offline data, storage migrations and push are concrete talking points (`INFERENCE`).
- **Path to stores:** via Capacitor (option C); Capacitor docs not read (C145, `UNKNOWN`).

### B. Expo / React Native: `expo-sqlite`, local notifications

- **Cost:** any build on an iPhone needs a paid Apple Developer account, except a local cable build (S121, C144). The Apple fee is `UNKNOWN` (Apple pages reset, C145). The free Expo Build tier allows up to 15 Android and 15 iOS builds per month (S122).
- **Install, Android:** an APK can go to friends directly. Android developer verification expands globally in 2027; students and hobbyists can share with up to 20 devices without ID or fee (S118, C143).
- **Install, iOS:** needs the paid account and device provisioning or TestFlight; TestFlight terms are `UNKNOWN` (C145).
- **Reminders:** local scheduled notifications need no server (`INFERENCE`; expo-notifications docs not read, C145).
- **Offline/storage:** on-device SQLite (`INFERENCE`; expo-sqlite docs not read, C145).
- **Developer speed:** good for TypeScript, but React Native and native build tooling are new to the owner (`INFERENCE`).
- **Testability:** unit tests are easy; device end-to-end tests are heavier (`INFERENCE`).
- **Interview value:** strong (native mobile). **Path to stores:** direct.

### C. PWA now, wrapped with Capacitor later

- Same as A for v0.1. Keeps the option of store builds, and native local notifications, if the PWA reminder or storage fails.
- Capacitor's capabilities and license are `UNKNOWN` here (C145); the migration cost is an estimate, not verified.

### D. Flutter

- **Rejected.** Dart is a new language for a TypeScript developer with 7–10 hrs/week. iPhone device installs face the same Apple signing constraint as native builds (`INFERENCE` by analogy to S121; not verified for Flutter). No advantage over B for this owner.

## 3. Decision (proposed)

**Option C: ship v0.1 as a PWA (option A), keep Capacitor as the later store path.**

Three strongest reasons:

1. **No store fees or accounts** to put it on friends' Android phones and iPhones (S116, C139). Option B needs a paid Apple account for every iPhone build (S121, C144).
2. **Fastest for this owner:** one TypeScript codebase in a familiar stack, testable in CI without devices (`INFERENCE`).
3. **Reversible:** data export and a Capacitor wrap keep options open without a rewrite of app logic (`INFERENCE`; Capacitor `UNKNOWN`).

**Strongest reason against:** the daily reminder, which is the habit trigger. On iPhone it only works after "Add to Home Screen" and a permission tap (S114). It also needs a server to send Web Push daily (C146), which breaks "no backend" and adds a moving part. And iOS storage is best-effort (S115). If the spike (§7) fails, option B is the fallback, at the cost of the Apple fee.

## 4. iPhone friend-testing plan

1. Check the iPhone runs iOS 16.4 or later (S114, S116).
2. Open the app link in Safari (or Chrome, Edge, Firefox) (S116).
3. Tap Share → "Add to Home Screen" → Add.
4. **Close the browser tab.** From now on, open the app only from the Home Screen icon.
5. In the app, tap "Turn on daily reminder" and allow notifications (S114).
6. Import a reviewer, then tap "Export backup" once.

**If a friend skips "Add to Home Screen":**
- No reminders: Web Push is only for Home Screen web apps (S114).
- Weaker storage persistence: the persist() heuristic favors Home Screen web apps (S115).
- Whether a Safari tab and the Home Screen app share the same data is `UNKNOWN`; the spike checks it.

## 5. Storage design sketch (no code)

- **Stores (IndexedDB):**
  - `decks`: subject or chapter, source label, created date.
  - `items`: question, choices, answer, rationale, type, source reference, "reported wrong" flag.
  - `reviews`: append-only log of item, time, answer, correct, and grade.
  - `exams`: subject or chapter and exam date.
  - `settings`: reminder time, dark mode, mascot on/off.
  - `meta`: schema version and last backup date.
- **Scheduling state** (next due date, etc.) is derived from `reviews`, so a scheduler change (ADR-002) can recompute it.
- **Backup:** export everything to one versioned JSON file, with restore from file. Nudge for a backup weekly and before an exam week, because data loss must not be fatal (S115, S120).
- **Schema versioning:** a version number in `meta` and in every export file. Ordered, tested migrations run on open; restore applies the same migrations to old files.
- **Privacy:** data stays on the device. The push sender stores only a push subscription and reminder time, no study content (`INFERENCE`; design rule).

## 6. Risks and reversibility

| Risk | Signal to switch | Switch cost |
|---|---|---|
| iOS reminders unreliable or too much setup friction | Spike fails, or friends never enable reminders | Medium: wrap with Capacitor or move to B; logic and data model carry over (`INFERENCE`) |
| iOS data eviction | Data missing in the spike or in friends' use | Low with export/restore; medium if moving to native storage |
| Push sender cost or complexity | Free scheduler not available or unreliable (`UNKNOWN`) | Low: swap the provider; the sender is small |
| Android 2027 verification rules | Only matters for APK distribution (B) (S118) | None for a PWA |
| Store presence needed later | Paid launch or discoverability | Capacitor wrap plus store fees: Google US$25 one-time (S117); Apple fee `UNKNOWN` |

## 7. Proposed spike (NOT authorized)

- **Goal:** test the riskiest assumption, the iPhone Home Screen reminder and data persistence, in 1–2 sessions with throwaway code.
- **Setup:** a minimal installable page with a manifest, a subscribe button, one IndexedDB record, and a free scheduled job that sends one push a day. Run on one iPhone (iOS ≥16.4) and one Android phone for 7 days.
- **Record:** the persist() result, push delivery times, data present each day, and whether Safari-tab data equals Home Screen data.
- **Pass:** on both phones, ≥6 of 7 daily pushes arrive within 15 minutes of the set time, and the day-1 record is intact on day 7.
- **Fail:** fewer than 6 pushes on iPhone, or data lost. Then reconsider B or Capacitor before the first build.

## 8. Deferred to ADR-002

- Scheduler algorithm: FSRS vs SM-2.
- UI framework details (for example Astro islands vs a SPA framework).
- Deck-sharing backend for v0.2.

## Amendments (D-010)

Approved by the owner on 2026-11-14 with these amendments:

1. **v0.1 reminders = calendar .ics** (a repeating daily event with an alert) **plus a "due today" screen on app open.** Web push is deferred to ADR-002, and only if the .ics approach fails or friends ignore it.
2. **Backup export is mandatory:** one-tap "Export my data", and a gentle weekly reminder to export.
3. **SPIKE-001** tests (a) storage, (b) .ics reminders and (c) export round-trip. If (a) fails on iPhone, switch to Expo, as the fallback in §3 says. Results: product/SPIKE-001-results.md.
