/**
 * Sprint fix: a checked answer is saved even when the student leaves before tapping Next
 * (End session, back → Leave, app sent to the background). Each answer is saved exactly once.
 */
import { expect, test, type Page } from '@playwright/test';
import { countStore, importFixture, openFresh, startSession } from './helpers';

const question = (page: Page, n: number) => page.getByRole('heading', { name: `Question ${n} of 5` });

/** Fake "app went to the background" for the page (Chromium in tests never hides on its own). */
async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('End session right after checking an answer keeps that answer', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await expect(question(page, 1)).toBeVisible();
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await expect.poll(() => countStore(page, 'reviews')).toBe(1);
  await expect(page.getByTestId('due-count')).toContainText('4 items due today');
});

test('back → Leave session keeps the checked answer, as the dialog promises', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await page.goBack();
  const dialog = page.getByRole('alertdialog', { name: 'Leave this session?' });
  await expect(dialog).toContainText('Your answers so far are saved.');
  await dialog.getByRole('button', { name: 'Leave session' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await expect.poll(() => countStore(page, 'reviews')).toBe(1);
});

test('app sent to the background saves the checked answer once; Next afterwards does not duplicate it', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await setHidden(page, true);
  await expect.poll(() => countStore(page, 'reviews')).toBe(1);
  await setHidden(page, false);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(question(page, 2)).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(1);
  await page.getByRole('button', { name: 'c. Triangle' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(question(page, 3)).toBeVisible();
  await expect.poll(() => countStore(page, 'reviews')).toBe(2);
});

test('a question that was not answered is not saved when leaving', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await expect(question(page, 1)).toBeVisible();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await countStore(page, 'reviews')).toBe(0);
});
