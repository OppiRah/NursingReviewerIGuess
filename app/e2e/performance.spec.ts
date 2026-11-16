import { expect, test } from '@playwright/test';
import { localDatePlus, nav, openFresh } from './helpers';

// 1,000 generic synthetic items (~145 KB). Imported through the real .txt upload path.
// (Playwright's fill() on a large textarea is quadratic in this setup, unlike a real paste.)
const FIXTURE_1000 = 'e2e/fixtures/synthetic-1000.txt';

test('1,000 items: Today renders and a session starts in under 1 second', async ({ page }, testInfo) => {
  await openFresh(page);
  await nav(page, 'Import');
  let t0 = Date.now();
  await page.getByLabel('Or choose a file (.pdf, .docx, .txt)').setInputFiles(FIXTURE_1000);
  await expect(page.getByTestId('parsed-count')).toHaveText('1000');
  const importPreviewMs = Date.now() - t0;
  await page.getByLabel('Exam date').fill(localDatePlus(10));
  t0 = Date.now();
  await page.getByRole('button', { name: 'Save 1000 questions' }).click();
  await expect(page.getByTestId('due-count')).toBeVisible();
  const saveMs = Date.now() - t0;

  // Cold start: full reload → Today with counts.
  t0 = Date.now();
  await page.reload();
  await expect(page.getByTestId('due-count')).toContainText('100 items due today'); // 1000 new ÷ 10 days
  const todayReloadMs = Date.now() - t0;

  // Warm navigation: Settings → Today.
  await nav(page, 'Settings');
  t0 = Date.now();
  await nav(page, 'Today');
  await expect(page.getByTestId('due-count')).toBeVisible();
  const todayNavMs = Date.now() - t0;

  // Session start: tap Start review → queue built and the start screen is shown.
  t0 = Date.now();
  await page.getByRole('button', { name: 'Start review' }).click();
  await expect(page.getByRole('button', { name: 'Begin' })).toBeVisible();
  const sessionStartMs = Date.now() - t0;
  t0 = Date.now();
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByRole('heading', { name: 'Question 1 of 10' })).toBeVisible();
  const firstQuestionMs = Date.now() - t0;

  // Decks screen with readiness over 1,000 items.
  await page.getByRole('button', { name: 'End session' }).click();
  t0 = Date.now();
  await nav(page, 'Decks');
  await expect(page.getByText(/1000 items · Readiness/)).toBeVisible();
  const decksMs = Date.now() - t0;

  const timings = { importPreviewMs, saveMs, todayReloadMs, todayNavMs, sessionStartMs, firstQuestionMs, decksMs };
  testInfo.annotations.push({ type: 'timings', description: JSON.stringify(timings) });
  console.log('PERF 1000 items:', JSON.stringify(timings));

  expect(todayReloadMs).toBeLessThan(1000);
  expect(todayNavMs).toBeLessThan(1000);
  expect(sessionStartMs).toBeLessThan(1000);
  expect(firstQuestionMs).toBeLessThan(1000);
});
