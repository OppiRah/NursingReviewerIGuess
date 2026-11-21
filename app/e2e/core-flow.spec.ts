import { expect, test } from '@playwright/test';
import { countStore, importFixture, nav, openFresh, startSession } from './helpers';

test('import → review session → persistence → export → wipe → restore', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));

  await openFresh(page);
  await expect(page.getByText('No reviewers yet.')).toBeVisible();
  // The shipped build carries the strict CSP, and no inline scripts exist.
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /script-src 'self'; style-src 'self'/);
  expect(await page.locator('script:not([src])').count()).toBe(0);

  // Import with preview.
  await nav(page, 'Import');
  await page.getByLabel('Or choose a file (.pdf, .docx, .txt)').setInputFiles('e2e/fixtures/synthetic-deck.txt');
  await expect(page.getByTestId('parsed-count')).toHaveText('5');
  await expect(page.getByText('1 warning')).toBeVisible(); // item 4 has no rationale
  await expect(page.getByLabel('Deck title')).toHaveValue('Synthetic Test Deck');
  await nav(page, 'Today');
  await importFixture(page);

  // Today shows items due and the exam countdown.
  await expect(page.getByTestId('due-count')).toContainText('5 items due today');
  await expect(page.getByTestId('exam-label')).toHaveText('10 days to Synthetic Test Deck exam');

  // Complete a session: right on 1, wrong on 2, then whatever comes.
  await startSession(page);
  await expect(page.getByRole('heading', { name: 'Question 1 of 5' })).toBeVisible();
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible();
  await expect(page.getByText('Sample rationale 1.')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('heading', { name: 'Question 2 of 5' })).toBeVisible();
  await page.getByRole('button', { name: 'a. Square' }).click();
  await expect(page.getByRole('heading', { name: 'Not quite' })).toBeVisible();
  await expect(page.getByText('Answer: c. Triangle')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  for (let q = 3; q <= 5; q++) {
    await expect(page.getByRole('heading', { name: `Question ${q} of 5` })).toBeVisible();
    await page.locator('.choices button').first().click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  await expect(page.getByTestId('summary')).toContainText('You answered 5 items');
  await page.getByRole('button', { name: 'Back to Today' }).click();
  await expect(page.getByTestId('due-count')).toContainText('0 items due today');

  // Reload: reviews persisted, due count stays down.
  await page.reload();
  await expect(page.getByTestId('due-count')).toContainText('0 items due today');
  expect(await countStore(page, 'reviews')).toBe(5);
  expect(await countStore(page, 'items')).toBe(5);

  // Export.
  await nav(page, 'Settings');
  await expect(page.getByTestId('last-export')).toHaveText('Last confirmed backup: never');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^reviewer-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const backupPath = await download.path();
  // A-08 (v0.2.1): the download alone is not a backup; the student confirms they found the file.
  await expect(page.getByTestId('last-export')).toHaveText('Last confirmed backup: never');
  await page.getByRole('button', { name: 'Yes, I found the file' }).click();
  await expect(page.getByTestId('last-export')).not.toHaveText('Last confirmed backup: never');

  // Wipe (with on-screen confirmation).
  await page.getByRole('button', { name: 'Wipe all data' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page.getByText('All data on this device was deleted.')).toBeVisible();
  expect(await countStore(page, 'items')).toBe(0);
  expect(await countStore(page, 'reviews')).toBe(0);

  // Restore.
  await nav(page, 'Settings');
  await page.getByTestId('backup-file').setInputFiles(backupPath);
  await page.getByRole('button', { name: 'Replace my data with this backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  expect(await countStore(page, 'items')).toBe(5);
  expect(await countStore(page, 'reviews')).toBe(5);
  await nav(page, 'Today');
  await expect(page.getByTestId('due-count')).toContainText('0 items due today');
  await expect(page.getByTestId('exam-label')).toHaveText('10 days to Synthetic Test Deck exam');

  // Privacy: every request stayed on this origin; no CSP violations or errors.
  const origin = new URL(page.url()).origin;
  expect(requests.filter((u) => !u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:'))).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('a malformed backup is rejected and existing data is untouched', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await nav(page, 'Settings');
  await page.getByTestId('backup-file').setInputFiles('e2e/fixtures/bad-backup.json');
  await expect(page.getByRole('alert')).toContainText('damaged');
  await expect(page.getByRole('button', { name: 'Replace my data with this backup' })).toHaveCount(0);
  expect(await countStore(page, 'items')).toBe(5);
});
