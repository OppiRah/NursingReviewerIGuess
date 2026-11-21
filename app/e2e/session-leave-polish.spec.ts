/**
 * Polish C-1/C-2/T-1: the save state on screen is honest, a stale error is cleared once the answer is
 * really saved, and leaving the session moves history exactly once (never past Today, never stuck).
 * Real IndexedDB writes are made to fail and work again in the page; counts come from the database.
 */
import { expect, test, type Page } from '@playwright/test';
import { countStore, importFixture, openFresh, startSession } from './helpers';

const today = (page: Page) => page.getByRole('heading', { name: 'Today', level: 1 });
const q1 = (page: Page) => page.getByRole('heading', { name: 'Question 1 of 5' });

async function writesFail(page: Page, fail: boolean): Promise<void> {
  await page.evaluate((f) => {
    const w = window as unknown as { __put?: typeof IDBObjectStore.prototype.put; __add?: typeof IDBObjectStore.prototype.add };
    w.__put ??= IDBObjectStore.prototype.put;
    w.__add ??= IDBObjectStore.prototype.add;
    const full = (): never => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.put = f ? full : w.__put;
    IDBObjectStore.prototype.add = f ? full : w.__add;
  }, fail);
}

async function background(page: Page): Promise<void> {
  for (const h of [true, false]) {
    await page.evaluate((hidden) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, h);
  }
}

/** On Today with no stale history: one Back leaves the app (so nothing overshot and nothing piled up). */
async function expectCleanToday(page: Page): Promise<void> {
  await expect(today(page)).toBeVisible();
  await page.goBack();
  await expect.poll(() => page.url()).toBe('about:blank');
}

test('C-2: a failed background save shows an error; a successful background retry clears it and says the answer is saved', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await expect(page.getByRole('button', { name: 'Easy, show less often' })).toBeVisible();
  await writesFail(page, true);
  await background(page);
  await expect(page.getByTestId('save-error')).toContainText('out of storage space');
  expect(await countStore(page, 'reviews')).toBe(0);

  await writesFail(page, false);
  await background(page); // the app goes to the background again: this time the save works
  await expect(page.getByTestId('save-error')).toHaveCount(0);
  await expect(page.getByTestId('answer-saved')).toBeVisible();
  // Already saved, so the grade can no longer change: "Easy" is not offered any more.
  await expect(page.getByRole('button', { name: 'Easy, show less often' })).toHaveCount(0);
  expect(await countStore(page, 'reviews')).toBe(1);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Question 2 of 5' })).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(1);
});

test('T-1: Back → Leave with a failing save stays; repeated Back → Leave stays; "Leave anyway" returns to Today once, with one review', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await writesFail(page, true);

  await page.goBack();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Leave session' }).click();
  await expect(page.getByRole('button', { name: 'Leave anyway (this answer may not be saved)' })).toBeVisible();
  await expect(q1(page)).toBeVisible();

  // Back → Leave again while it still fails: still not trapped, still not moved.
  await page.goBack();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Leave session' }).click();
  await expect(q1(page)).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(0);

  // Space is back; "Leave anyway" leaves at once, and the answer is still saved once on the way out.
  await writesFail(page, false);
  await page.getByRole('button', { name: 'Leave anyway (this answer may not be saved)' }).click();
  await expect(today(page)).toBeVisible();
  await expect.poll(() => countStore(page, 'reviews')).toBe(1);
  await expectCleanToday(page);
});

test('T-1: double-clicking End session leaves once, saves once, and never overshoots Today', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await page.getByRole('button', { name: 'End session' }).dblclick();
  await expect(today(page)).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(1);
  await expectCleanToday(page);
});

test('T-1: Back pressed while End session is already leaving moves history only once', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  // End session starts leaving (saving first); Back arrives while that leave is in progress.
  // (Back first would open the modal "Leave this session?" dialog, which itself blocks End session.)
  await page.getByRole('button', { name: 'End session' }).click();
  await page.goBack();
  // The Back press is absorbed by the leave in progress: no second "Leave this session?" dialog.
  await expect(today(page)).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect.poll(() => countStore(page, 'reviews')).toBe(1);
  await expectCleanToday(page);
});
