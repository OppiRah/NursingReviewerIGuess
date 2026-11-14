# SPIKE-001 results (owner fills in)

- **Spike:** `spike/pwa-check/` (throwaway; D-010) · **ADR:** product/ADR-001-platform.md
- **Test URL (HTTPS):** ______________________ · **Start date (day 0):** __________

## Devices

| Phone | OS version | Browser | Installed to home screen (yes/no) |
|---|---|---|---|
| iPhone: | iOS | Safari | |
| Android: | Android | Chrome | |

## (a) Storage log

Open the app **from the home-screen icon** each time. Copy the values from the Storage panel.

| Day | Device | Item count | Checksum (first 8 chars) | Unchanged vs day 0 (yes/no) | persist() result |
|---|---|---|---|---|---|
| 0 | iPhone | | | — | |
| 1 | iPhone | | | | |
| 3 | iPhone | | | | |
| 7 | iPhone | | | | |
| 0 | Android | | | — | |
| 1 | Android | | | | |
| 3 | Android | | | | |
| 7 | Android | | | | |

## (b) Reminder (.ics)

| Device | Calendar app | Imported OK (yes/no) | Alert fired day 1 (yes/no) | Alert fired day 2 (yes/no) | Notes |
|---|---|---|---|---|---|
| iPhone | | | | | |
| Android | | | | | |

## (c) Backup round-trip

| Device | Export OK | Wipe OK (count 0) | Import result (PASS/FAIL) | Self-test (PASS/FAIL) |
|---|---|---|---|---|
| iPhone | | | | |
| Android | | | | |

## Decision rules (fixed before the test)

- **(a) PASS** = data intact on day 7 on the iPhone home-screen app **and** on Android. **If it fails on iPhone → switch to Expo** (ADR-001 fallback).
- **(b) PASS** = the alert fires on 2 consecutive days on both platforms. **If it fails → ADR-002 evaluates web push through a free serverless cron.**
- **(c)** must PASS on both. **If it fails → fix before any build.**

## Outcome

- (a): ______ (b): ______ (c): ______
- **Decision:** __________________________________________ (date: ________)
