/**
 * A-03 / BETA-PREP: the real update path, with the service worker enabled.
 * A "new deploy" is simulated by changing dist/sw.js on disk (vite preview serves dist as-is).
 */
import { expect, test } from '@playwright/test';
import { importFixture, nav, openFresh, startSession } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('a new version shows a banner (never during a session) and applies on tap without losing data', async ({ page }) => {
  const fs = await import('node:' + 'fs');
  const original = fs.readFileSync('dist/sw.js', 'utf8') as string;
  try {
    await openFresh(page);
    // First install: the worker takes control on the next load; no banner for a first install.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await expect(page.getByTestId('update-banner')).toHaveCount(0);
    await importFixture(page);

    // Start a session, then "deploy" a new version and let the browser find it.
    await startSession(page);
    fs.writeFileSync('dist/sw.js', `${original}\n// new deploy ${Date.now()}\n`);
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.update()));
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r?.waiting))).toBe(true);
    // In a session: no banner, no reload, the question stays.
    await expect(page.getByTestId('update-banner')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Question 1 of/ })).toBeVisible();
    await page.locator('.choices button').first().click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'End session' }).click();

    // Outside the session: banner, tap, reload into the new version, data intact.
    await expect(page.getByTestId('update-banner')).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'New version available — tap to update' }).click()]);
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
    await expect(page.getByTestId('update-banner')).toHaveCount(0);
    expect(await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r?.waiting))).toBe(false);
    await nav(page, 'Decks');
    await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(1);
  } finally {
    fs.writeFileSync('dist/sw.js', original);
  }
});
