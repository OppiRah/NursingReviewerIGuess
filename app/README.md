# Nursing Reviewer (app)

A local-first, offline PWA: paste your own reviewers and get short daily active-recall sessions, scheduled with FSRS backward from your exam date. No accounts, no server, no AI calls. Everything stays on the device.

Design: `../docs/product/ARCHITECTURE.md` · decisions: `../docs/product/ADR-002-stack-scheduler-import.md` · build record: `../docs/product/BUILD_LOG.md`.

## Run, test, build

Requires Node 24+ (ts-fsrs 6 requires it).

```bash
npm install
npx playwright install chromium   # once, for E2E

npm run dev          # local dev server (no CSP in dev; the CSP is added at build time)
npm run typecheck    # TypeScript strict
npm test             # unit tests (Vitest + fake-indexeddb)
npm run test:e2e     # builds, serves the production bundle on :4173, runs Playwright (Chromium)
npm run build        # production build → dist/
npm run preview      # serve dist/ on http://localhost:4173
```

## Deploy (owner step, manual)

1. `npm run build`
2. Drag the `app/dist` folder onto **Netlify Drop** (or your claimed Netlify site's Deploys page).
3. Open the HTTPS URL on your phone once to check it loads.

The site must be served over HTTPS for install, the service worker and backups (`crypto.subtle`). If your host supports headers, also add `Content-Security-Policy: frame-ancestors 'none'` (a meta tag can't set that one).

## Friends: how to use it

1. Open the link. **iPhone:** Safari → Share → *Add to Home Screen*, then always open it from the icon. **Android:** Chrome menu → *Install app*.
2. **Import a reviewer:** paste text that has `Answer:` and `Rationale:` lines, or upload a `.txt` file.
3. **Bring your own AI:** on Import, tap **Copy BYO-AI prompt**, paste it into ChatGPT/Claude/Gemini, add your notes after it, and paste the chatbot's answer back into Import. Check the preview: problems are listed by line.
4. Set the **exam date**, save, and tap **Start review** each day.
5. **Settings → Export backup** once a week (your data lives only on that phone). **Add daily reminder to calendar** for a daily alert.

Import format (short): numbered question, lettered choices, `Answer: b` (or `Answer: a, c` for select-all), `Rationale: …`, optional `---` between items, `Type: priority` before a priority question, `Q:` / `A:` for flashcards.

## Known issues

- Not yet tested on real iPhones/Android phones: home-screen storage persistence, `.ics` alarms, install flow.
- iOS may clear website data under storage pressure; keep exporting backups.
- The Android back button leaves the app (no URL routes yet).
- A wrapped line starting with the next expected choice letter (e.g. "C. diff" exactly where choice c goes) is read as a choice; fix it in the preview or the Deck editor.
- `npm audit` reports 6 issues (2 low, 4 moderate) in build-time tooling only (`vite-plugin-pwa` → `workbox-build`); production dependencies report 0.
- The mascot and icons are placeholders.
