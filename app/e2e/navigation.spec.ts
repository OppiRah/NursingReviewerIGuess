import { expect, test } from '@playwright/test';
import { importFixture, nav, openFresh, startSession } from './helpers';

// Android's back button = browser history back. page.goBack() simulates it.
const heading = (name: string | RegExp) => ({ name, level: 1 as const });

test('back moves to the previous screen; back on Today leaves the app', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Decks');
  await expect(page.getByRole('heading', heading('Decks'))).toBeVisible();
  await nav(page, 'Import');
  await expect(page.getByRole('heading', heading('Import a reviewer'))).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', heading('Decks'))).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', heading('Today'))).toBeVisible();

  // Today is the base entry: back now leaves the app (here: the blank page the test started from).
  await page.goBack();
  await expect.poll(() => page.url()).toBe('about:blank');
});

test('the Today tab returns to the base entry, so back from Today still leaves', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Settings');
  await nav(page, 'Decks');
  await nav(page, 'Today');
  await expect(page.getByRole('heading', heading('Today'))).toBeVisible();
  await page.goBack();
  await expect.poll(() => page.url()).toBe('about:blank');
});

test('back during a session asks first; Stay keeps the session, Leave returns to Today', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await expect(page.getByRole('heading', heading(/^Question 1 of \d+$/))).toBeVisible();

  await page.goBack();
  const dialog = page.getByRole('alertdialog', { name: 'Leave this session?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Your answers so far are saved.');
  await dialog.getByRole('button', { name: 'Stay' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', heading(/^Question 1 of \d+$/))).toBeVisible();

  await page.goBack();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Leave session' }).click();
  await expect(page.getByRole('heading', heading('Today'))).toBeVisible();

  // Leaving left no stale session entry behind: back on Today leaves the app.
  await page.goBack();
  await expect.poll(() => page.url()).toBe('about:blank');
});

test('ending a session with its own button needs no confirmation', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', heading('Today'))).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('after onboarding → Import, back goes to Today, never to onboarding again (review #3)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Step 2 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Import my first reviewer' }).click();
  await expect(page.getByRole('heading', heading('Import a reviewer'))).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', heading('Today'))).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test('Forward after leaving a session does not silently restart it (review #8a)', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.goBack();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Leave session' }).click();
  await expect(page.getByRole('heading', heading('Today'))).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', heading('Today'))).toBeVisible();
  await expect(page.getByRole('heading', heading(/^Question \d+ of \d+$/))).toHaveCount(0);
});

test('"← All decks" goes back instead of piling up history (review #9)', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await nav(page, 'Decks');
  await page.locator('.deck-list').getByRole('button').first().click();
  await page.getByRole('button', { name: '← All decks' }).click();
  await expect(page.getByRole('heading', heading('Decks'))).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', heading('Today'))).toBeVisible();
});
