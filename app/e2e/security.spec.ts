import { expect, test } from '@playwright/test';
import { nav, openFresh, startSession } from './helpers';

/** Set the textarea the way a single paste does (one input event). */
async function pasteInto(page: import('@playwright/test').Page, label: string, text: string): Promise<void> {
  await page.getByLabel(label).evaluate((el, v) => {
    const ta = el as HTMLTextAreaElement;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(ta, v);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, text);
}

test('imported text is rendered as plain text, never as HTML', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await openFresh(page);
  await nav(page, 'Import');
  const evil = [
    '# <img src=x onerror="alert(1)"> deck',
    '1. Sample <b>bold</b>? <img src=x onerror="alert(2)">',
    'a. <script>alert(3)</script>',
    'b. <a href="javascript:alert(4)">link</a>',
    'Answer: a',
    'Rationale: <iframe src="https://example.com"></iframe>',
  ].join('\n');
  await pasteInto(page, 'Paste your reviewer', evil);
  await expect(page.getByTestId('parsed-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Save 1 question' }).click();
  await startSession(page);
  await expect(page.locator('.question-text')).toHaveText('Sample <b>bold</b>? <img src=x onerror="alert(2)">');
  await page.getByRole('button', { name: 'a. <script>alert(3)</script>' }).click();
  await expect(page.locator('.rationale')).toContainText('<iframe src="https://example.com"></iframe>');
  // No injected elements exist anywhere in the app.
  expect(await page.locator('main img, main script, main iframe, main b, main a[href]').count()).toBe(0);
  expect(dialogs).toEqual([]);
});

test('import over 2 MB is refused with a friendly message', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Import');
  await pasteInto(page, 'Paste your reviewer', '1. Sample?\n' + 'x'.repeat(2 * 1024 * 1024 + 10));
  await expect(page.getByTestId('parse-errors')).toContainText('larger than 2 MB');
  await expect(page.getByTestId('parsed-count')).toHaveText('0');
  await expect(page.getByRole('button', { name: /^Save/ })).toBeDisabled();
});

test('no network requests leave the origin during a full session', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://localhost:4173') && !u.startsWith('blob:') && !u.startsWith('data:')) external.push(u);
  });
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel('Or choose a file (.pdf, .docx, .txt)').setInputFiles('e2e/fixtures/mixed-deck.txt');
  await page.getByRole('button', { name: /^Save/ }).click();
  await startSession(page);
  await page.getByRole('button', { name: 'End session' }).click();
  await nav(page, 'Settings');
  await page.getByRole('button', { name: 'Add daily reminder to calendar' }).click();
  expect(external).toEqual([]);
});
