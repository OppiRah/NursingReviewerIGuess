/**
 * Completion sprint: the app stays usable when something goes wrong.
 * - A screen that fails to render shows a way out (not a blank page); the tab bar keeps working.
 * - A full disk while saving gives a clear message, saves nothing half-way, and keeps the student's text.
 */
import { expect, test, type Page } from '@playwright/test';
import { countStore, importFixture, localDatePlus, nav, openFresh } from './helpers';

/** Corrupt one stored item the way a damaged record could look (choices missing). */
async function corruptFirstItem(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('nursing-reviewer');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('items', 'readwrite');
          const store = tx.objectStore('items');
          const cur = store.openCursor();
          cur.onsuccess = () => {
            const c = cur.result;
            if (c) c.update({ ...c.value, choices: null });
          };
          tx.oncomplete = () => {
            req.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test('a screen that cannot render shows a recovery screen; the tab bar and Settings still work', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openFresh(page);
  await importFixture(page);
  await corruptFirstItem(page);
  await nav(page, 'Decks');
  await page.getByRole('button', { name: /^Open / }).first().click();

  const crash = page.getByTestId('screen-error');
  await expect(crash).toBeVisible();
  await expect(crash).toContainText('Your decks and answers are still saved on this device.');
  await expect(page.getByRole('heading', { name: "This screen couldn't be shown" })).toBeFocused();

  // The tab bar is outside the failed screen: Settings (backup, feedback) is always reachable.
  await nav(page, 'Settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(crash).toHaveCount(0);
  await page.getByRole('button', { name: 'Copy feedback info' }).click();
  await expect(page.getByTestId('feedback-status')).toContainText('Copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Last error:');
  expect(copied).not.toContain('Last error: none');
  expect(copied).not.toMatch(/Synthetic|sky|Blue|Triangle/i);

  // "Back to Today" from the recovery screen works too.
  await nav(page, 'Decks');
  await page.getByRole('button', { name: /^Open / }).first().click();
  await expect(crash).toBeVisible();
  await page.getByRole('button', { name: 'Back to Today' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
});

test('a full disk while saving an import gives a clear message and saves nothing half-way', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel('Or choose a file (.pdf, .docx, .txt)').setInputFiles('e2e/fixtures/synthetic-deck.txt');
  await expect(page.getByTestId('parsed-count')).toHaveText('5');
  // Every IndexedDB write now fails the way a full phone does.
  await page.evaluate(() => {
    const full = (): never => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.add = full;
    IDBObjectStore.prototype.put = full;
  });
  await page.getByRole('button', { name: 'Save 5 questions' }).click();
  await expect(page.getByRole('alert')).toContainText('out of storage space');
  await expect(page.getByRole('alert')).toContainText('nothing was saved');
  // Still on Import with the text kept, and nothing half-saved.
  await expect(page.getByRole('heading', { name: 'Import a reviewer', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Paste your reviewer')).toHaveValue(/Sample question 1/);
  expect(await countStore(page, 'decks')).toBe(0);
  expect(await countStore(page, 'items')).toBe(0);
});

test('Settings says when the browser has not promised to keep the data, and stays quiet when it has', async ({ page, browser }) => {
  await openFresh(page);
  await nav(page, 'Settings');
  const hint = page.getByTestId('storage-not-protected');
  if (await page.evaluate(() => navigator.storage.persisted())) await expect(hint).toHaveCount(0);
  else await expect(hint).toContainText('keeping a backup file protect you');

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'persisted', { configurable: true, value: () => Promise.resolve(true) });
  });
  await openFresh(p2);
  await nav(p2, 'Settings');
  await expect(p2.getByTestId('last-export')).toBeVisible();
  await expect(p2.getByTestId('storage-not-protected')).toHaveCount(0);
  await ctx.close();
});

test('deck details: a past date is explained, a save says "Saved.", and a failed save never claims it was saved', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await nav(page, 'Decks');
  await page.getByRole('button', { name: /^Open / }).first().click();
  await page.locator('summary', { hasText: 'Deck details' }).click();
  const date = page.getByLabel('Exam date');

  await date.fill('2020-01-01');
  await expect(page.getByRole('alert')).toContainText('That date has already passed');
  await expect(page.getByRole('button', { name: 'Save deck details' })).toBeDisabled();

  await page.getByLabel('Deck title').fill('Renamed sample deck');
  await date.fill(localDatePlus(20));
  await expect(page.locator('#deck-edit-exam-hint')).toContainText('re-plans this deck');
  await page.getByRole('button', { name: 'Save deck details' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible();

  // Now every write fails like a full phone: no "Saved.", a clear message instead.
  await page.evaluate(() => {
    const full = (): never => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    };
    IDBObjectStore.prototype.put = full;
    IDBObjectStore.prototype.add = full;
  });
  await page.getByLabel('Deck title').fill('Renamed again');
  await page.getByRole('button', { name: 'Save deck details' }).click();
  await expect(page.getByRole('alert')).toContainText('out of storage space');
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toHaveCount(0);
});
