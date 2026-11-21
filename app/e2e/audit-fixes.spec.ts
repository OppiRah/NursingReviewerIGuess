/** FIX-001 / BETA-PREP: browser-level regression tests for AUDIT-001 findings. */
import { expect, test } from '@playwright/test';
import { importFixture, nav, openFresh, startSession } from './helpers';

test('A-01: deleting a choice in the editor keeps the same choice marked correct', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await nav(page, 'Decks');
  await page.getByRole('button', { name: /^Open / }).first().click();
  const row = page.getByTestId('item-row').first();
  await expect(row).toContainText('Answer: b. Blue');
  await row.getByRole('button', { name: /^Edit/ }).click();
  await expect(row.getByTestId('resolved-answer')).toHaveText('Will be saved as correct: b. Blue');
  // Remove the first (wrong) choice and leave the letter alone.
  await row.getByLabel(/^Choices/).fill('Blue\nRed\nYellow');
  await expect(row.getByTestId('resolved-answer')).toHaveText('Will be saved as correct: a. Blue');
  await row.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('Answer: a. Blue');

  // Typing a letter always wins: after a reorder the student can point the same letter at a new choice.
  await row.getByRole('button', { name: /^Edit/ }).click();
  await row.getByLabel(/^Choices/).fill('Red\nBlue\nYellow');
  await expect(row.getByTestId('resolved-answer')).toHaveText('Will be saved as correct: b. Blue');
  // The box already says "a": clear it and type it again, so the app knows it was chosen on purpose.
  await row.getByLabel('Correct letter(s)').fill('');
  await row.getByLabel('Correct letter(s)').fill('a');
  await expect(row.getByTestId('resolved-answer')).toHaveText('Will be saved as correct: a. Red');
  await row.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('Answer: a. Red');
  await row.getByRole('button', { name: /^Edit/ }).click();
  await row.getByLabel(/^Choices/).fill('Blue\nRed\nYellow');
  await row.getByLabel('Correct letter(s)').fill('');
  await row.getByLabel('Correct letter(s)').fill('a'); // same letter as before, typed on purpose
  await expect(row.getByTestId('resolved-answer')).toHaveText('Will be saved as correct: a. Blue');
  await row.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('Answer: a. Blue');

  // Removing the correct choice itself is refused.
  await row.getByRole('button', { name: /^Edit/ }).click();
  await row.getByLabel(/^Choices/).fill('Red\nYellow');
  await row.getByRole('button', { name: 'Save changes' }).click();
  await expect(row.getByRole('alert')).toContainText('removed or replaced the correct choice');
});

test('A-05/A-06/A-07: Today is honest about workload and progress; Import carries the content notice', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Import');
  await expect(page.getByTestId('content-notice')).toContainText('not medical advice');
  await importFixture(page, 'e2e/fixtures/synthetic-1000.txt', 10);
  await expect(page.getByTestId('due-count')).toContainText('100 items due today');
  await expect(page.getByTestId('workload')).toContainText('About 10 sessions today (10 items each)');
  await expect(page.getByTestId('seen')).toHaveText('seen 0 of 1000');
  await startSession(page);
  await page.locator('.choices button').first().click();
  await expect(page.getByTestId('content-notice')).toContainText('Check answers against your source');
});

test('A-08: export tells the student to check that the file was really saved', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await nav(page, 'Settings');
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  await expect(page.getByRole('status')).toContainText('does not count as a backup until you confirm');
});

test('A-08 (v0.2.1): only a confirmed backup silences the reminder; it survives a reload', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await expect(page.getByText("You haven't saved a backup yet.")).toBeVisible();
  await nav(page, 'Settings');

  // Attempt 1: downloaded, then "I can't find it" → nothing recorded, reminder stays.
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  await expect(page.getByTestId('confirm-export')).toBeVisible();
  await expect(page.getByTestId('last-export')).toHaveText('Last confirmed backup: never');
  await expect(page.getByRole('status')).toContainText('may or may not have saved it');
  await expect(page.getByRole('status')).not.toContainText(/backup (was )?(saved|confirmed)/i);
  await page.getByRole('button', { name: "I can't find it" }).click();
  await expect(page.getByTestId('confirm-export')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Not counted as a backup');
  await page.reload();
  await nav(page, 'Today');
  await expect(page.getByText("You haven't saved a backup yet.")).toBeVisible();

  // Attempt 2: downloaded, then a reload before confirming → the attempt is gone, nothing recorded.
  await nav(page, 'Settings');
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  await page.reload();
  await nav(page, 'Settings');
  await expect(page.getByTestId('confirm-export')).toHaveCount(0);
  await expect(page.getByTestId('last-export')).toHaveText('Last confirmed backup: never');

  // Attempts 3 and 4, then confirm → recorded, persists after reload, Today stops nudging.
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  await expect(page.getByTestId('confirm-export')).toHaveCount(1);
  await page.getByRole('button', { name: 'Yes, I found the file' }).click();
  await expect(page.getByRole('status')).toContainText('Backup confirmed');
  await expect(page.getByTestId('last-export')).not.toHaveText('Last confirmed backup: never');
  await page.reload();
  await nav(page, 'Settings');
  await expect(page.getByTestId('last-export')).not.toHaveText('Last confirmed backup: never');
  await nav(page, 'Today');
  await expect(page.getByText("You haven't saved a backup yet.")).toHaveCount(0);
  await expect(page.getByText("It's been a while since your last backup.")).toHaveCount(0);
});

test('A-08 (v0.2.1): a download that fails to start records nothing and says so', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await nav(page, 'Settings');
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('Synthetic download failure');
    };
  });
  await page.getByRole('button', { name: 'Export backup' }).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic download failure');
  await expect(page.getByTestId('confirm-export')).toHaveCount(0);
  await expect(page.getByTestId('last-export')).toHaveText('Last confirmed backup: never');
});

test('A-05/A-06 (v0.2.1): Today shows sessions, the deck outlook and the same readiness hint as the deck screen', async ({ page }) => {
  await openFresh(page);
  await importFixture(page, 'e2e/fixtures/synthetic-1000.txt', 3);
  await expect(page.getByTestId('workload')).toContainText(/^About \d+ sessions today \(10 items each\)/);
  await expect(page.getByTestId('outlook')).toContainText('1000 not seen yet');
  await expect(page.getByTestId('outlook')).toContainText('You may need more sessions to see every item');
  const todayHint = await page.getByTestId('readiness-hint').textContent();
  await expect(page.getByTestId('seen')).toHaveText('seen 0 of 1000');
  await nav(page, 'Decks');
  await page.getByRole('button', { name: /^Open / }).first().click();
  await expect(page.getByTestId('readiness-hint')).toHaveText(todayHint ?? '');
  await expect(page.getByTestId('deck-seen')).toHaveText('seen 0 of 1000');
  await expect(page.getByTestId('deck-readiness')).toHaveText('0%');
});

test('BETA-PREP: Settings shows the version and copies feedback info without any study content', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openFresh(page);
  await importFixture(page);
  await nav(page, 'Settings');
  await expect(page.getByTestId('app-version')).toHaveText(/^Version 0\.2\.2 · built \d{4}-\d{2}-\d{2}$/);
  await page.getByRole('button', { name: 'Copy feedback info' }).click();
  await expect(page.getByTestId('feedback-status')).toContainText('Copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Version: 0.2.2');
  expect(copied).toMatch(/Decks: 1 · Items: \d+ · Reviews: 0/);
  expect(copied).not.toMatch(/Synthetic|Sample|sky|Blue/i);
});

test('A-03: the built app registers its own service worker and can be told to update', async () => {
  const fs = await import('node:' + 'fs');
  const sw = fs.readFileSync('dist/sw.js', 'utf8') as string;
  expect(sw).toContain('SKIP_WAITING');
  expect(fs.existsSync('dist/registerSW.js'), 'the auto-register script is replaced by app code').toBe(false);
  const html = fs.readFileSync('dist/index.html', 'utf8') as string;
  expect(html).not.toContain('registerSW');
});
