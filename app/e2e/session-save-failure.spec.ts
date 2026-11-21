/**
 * R-3/R-4: when saving an answer fails, the session never pretends it was saved. The student stays on
 * the question with the error, can retry, or can choose to leave. Real IndexedDB writes are made to fail
 * (and then work again) in the page; review counts are read from the database itself.
 */
import { expect, test, type Page } from '@playwright/test';
import { countStore, importFixture, openFresh, startSession } from './helpers';

const q = (page: Page, n: number) => page.getByRole('heading', { name: `Question ${n} of 5` });

/** Make every IndexedDB write fail like a full phone (or work again). */
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

async function setHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('Next with a failing save: error shown, stays on the question, nothing counted; retry saves it once', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await writesFail(page, true);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByTestId('save-error')).toContainText('out of storage space');
  await expect(page.getByTestId('save-error')).toContainText('It was not counted yet');
  await expect(q(page, 1)).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(0);

  await writesFail(page, false);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(q(page, 2)).toBeVisible();
  await expect(page.getByTestId('save-error')).toHaveCount(0);
  expect(await countStore(page, 'reviews')).toBe(1);
});

test('background save fails, then End session: the failure is shown, the student stays, and can retry or leave anyway', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await writesFail(page, true);
  await setHidden(page, true); // background save is attempted and fails
  await setHidden(page, false);
  await expect(page.getByTestId('save-error')).toContainText('out of storage space');

  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('button', { name: 'Leave anyway (this answer may not be saved)' })).toBeVisible();
  await expect(q(page, 1)).toBeVisible(); // not silently sent to Today
  expect(await countStore(page, 'reviews')).toBe(0);

  // Space freed: End session again saves it exactly once and leaves.
  await writesFail(page, false);
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(1);
});

test('"Leave anyway" leaves the session when the save keeps failing', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await writesFail(page, true);
  await page.getByRole('button', { name: 'End session' }).click();
  await page.getByRole('button', { name: 'Leave anyway (this answer may not be saved)' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await writesFail(page, false);
});

test('back → Leave session with a failing save stays on the session and shows why', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await writesFail(page, true);
  await page.goBack();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Leave session' }).click();
  await expect(page.getByTestId('save-error')).toContainText('out of storage space');
  await expect(q(page, 1)).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(0);

  await writesFail(page, false);
  await page.goBack();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Leave session' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(1);
});

test('double-tapping Next saves once and advances once; a full session summary matches the stored reviews', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  await page.getByRole('button', { name: 'b. Blue' }).click();
  await setHidden(page, true); // background save first…
  await setHidden(page, false);
  await page.getByRole('button', { name: 'Next' }).dblclick(); // …then an eager double tap
  await expect(q(page, 2)).toBeVisible();
  expect(await countStore(page, 'reviews')).toBe(1);
  for (let n = 2; n <= 5; n++) {
    const cont = page.getByRole('button', { name: 'Continue' });
    await expect(q(page, n).or(cont)).toBeVisible();
    if (await cont.isVisible()) await cont.click();
    await expect(q(page, n)).toBeVisible();
    await page.locator('.choices button').first().click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(page.getByRole('heading', { name: 'Session complete' }).or(cont)).toBeVisible();
  if (await cont.isVisible()) await cont.click();
  await expect(page.getByTestId('summary')).toContainText('You answered 5 items');
  expect(await countStore(page, 'reviews')).toBe(5);
});
