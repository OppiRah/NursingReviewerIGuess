import { expect, type Page } from '@playwright/test';

export const FIXTURE = 'e2e/fixtures/synthetic-deck.txt';

/** Local date N days from today as YYYY-MM-DD (the browser shares this machine's timezone). */
export function localDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Fresh app with empty storage, past any first-run screens. */
export async function openFresh(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const skip = page.getByRole('button', { name: 'Skip intro' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
}

export async function nav(page: Page, name: 'Today' | 'Import' | 'Decks' | 'Settings'): Promise<void> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name }).click();
}

export async function importFixture(page: Page, file = FIXTURE, examInDays = 10): Promise<void> {
  await nav(page, 'Import');
  await page.getByLabel('Or choose a file (.pdf, .docx, .txt)').setInputFiles(file);
  await expect(page.getByTestId('preview')).toBeVisible();
  await page.getByLabel('Exam date').fill(localDatePlus(examInDays));
  await page.getByRole('button', { name: /^Save \d+ questions?$/ }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
}

/** Start a session from Today and pass the mascot's start moment. */
export async function startSession(page: Page, button: string | RegExp = 'Start review'): Promise<void> {
  await page.getByRole('button', { name: button }).click();
  await expect(page.getByTestId('mascot-start')).toBeVisible();
  await page.getByRole('button', { name: 'Begin' }).click();
}

/** Count rows in an IndexedDB store directly (independent of the UI). */
export async function countStore(page: Page, store: string): Promise<number> {
  return page.evaluate(
    (s) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('nursing-reviewer');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction(s, 'readonly');
          const c = tx.objectStore(s).count();
          c.onsuccess = () => {
            resolve(c.result);
            req.result.close();
          };
          c.onerror = () => reject(c.error);
        };
      }),
    store,
  );
}
