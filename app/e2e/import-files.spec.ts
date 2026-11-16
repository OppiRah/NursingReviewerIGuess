import { expect, test, type Page } from '@playwright/test';
import { localDatePlus, nav, openFresh, startSession } from './helpers';

// Synthetic files written by scripts/gen-fixtures.mjs (Playwright globalSetup). Never real reviewers.
const GEN = 'e2e/.generated';
const FILE_LABEL = 'Or choose a file (.pdf, .docx, .txt)';

/** Fail the test if the page talks to anything but itself (files must be read on the device). */
function trackRemoteRequests(page: Page): string[] {
  const remote: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://localhost:4173/') && !u.startsWith('blob:') && !u.startsWith('data:')) remote.push(u);
  });
  return remote;
}

/** Read a text file in the test runner (Node), without needing Node type packages. */
async function readText(path: string): Promise<string> {
  const mod = 'node:fs';
  const fs = (await import(mod)) as { readFileSync: (p: string, enc: string) => string };
  return fs.readFileSync(path, 'utf8');
}

test('PDF upload → editable preview → save → session, entirely on the device', async ({ page }) => {
  const remote = trackRemoteRequests(page);
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel(FILE_LABEL).setInputFiles(`${GEN}/sample.pdf`);

  // The extracted text lands in the editable textarea before parsing; the PDF's glued "--N."
  // separators and chapter heading are handled by normalization.
  await expect(page.getByTestId('parsed-count')).toHaveText('6');
  await expect(page.getByLabel('Paste your reviewer')).toHaveValue(/Sample PDF question 1/);
  await expect(page.getByTestId('parse-errors')).toHaveCount(0);
  await expect(page.getByLabel('Deck title')).toHaveValue('CHAPTER 1: SAMPLE PDF DECK');

  await page.getByLabel('Exam date').fill(localDatePlus(10));
  await page.getByRole('button', { name: 'Save 6 questions' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  await startSession(page);
  await expect(page.getByRole('heading', { name: /^Question 1 of \d+$/ })).toBeVisible();
  await expect(page.locator('.question-text')).toContainText('Sample PDF question');
  expect(remote, `remote requests: ${remote.join(', ')}`).toEqual([]);
});

test('DOCX upload → items parsed', async ({ page }) => {
  const remote = trackRemoteRequests(page);
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel(FILE_LABEL).setInputFiles(`${GEN}/sample.docx`);
  await expect(page.getByTestId('parsed-count')).toHaveText('5');
  await expect(page.getByTestId('parse-errors')).toHaveCount(0);
  await expect(page.getByLabel('Deck title')).toHaveValue('SECTION 1: Sample Word deck');
  expect(remote).toEqual([]);
});

test('an image-only PDF gets an honest "scanned" message and nothing is imported', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel(FILE_LABEL).setInputFiles(`${GEN}/scanned.pdf`);
  await expect(page.getByRole('alert')).toContainText('looks like scanned images or slides');
  await expect(page.getByTestId('preview')).toHaveCount(0);
});

test('pasting the PDF-artifacts fixture gives 30 items and 0 errors', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel('Paste your reviewer').fill(await readText('e2e/fixtures/pdf-artifacts.txt'));
  await expect(page.getByTestId('parsed-count')).toHaveText('30');
  await expect(page.getByTestId('parse-errors')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save 30 questions' })).toBeEnabled();
});

test('unsupported file types are refused with a clear message', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel(FILE_LABEL).setInputFiles({ name: 'slides.pptx', mimeType: 'application/octet-stream', buffer: new TextEncoder().encode('x') as never });
  await expect(page.getByRole('alert')).toContainText('not supported');
});

test('build output: the PDF/Word readers are not in the service-worker precache', async () => {
  const sw = await readText('dist/sw.js');
  const precached = [...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1] ?? '');
  expect(precached.length).toBeGreaterThan(5);
  expect(precached.filter((u) => /assets\/(pdf-|pdf\.worker|mammoth-)/.test(u))).toEqual([]);
  // ...but they are runtime-cached after first use, so later imports work offline.
  expect(sw).toContain('import-readers');
});

test('study notes (no questions) show the AI-prompt card first; details stay collapsed', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel(FILE_LABEL).setInputFiles('e2e/fixtures/prose-notes.txt');

  const card = page.getByTestId('notes-card');
  await expect(card).toContainText('This looks like study notes, not questions.');
  await expect(card).toContainText('Open ChatGPT/Claude, paste the prompt, then your notes');
  // The error list is not shown first: it sits inside the collapsed "Show details".
  await expect(page.getByTestId('preview')).toHaveCount(0);
  await expect(page.getByTestId('notes-details')).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('parse-errors')).toBeHidden();

  await card.getByRole('button', { name: 'Copy prompt' }).click();
  await expect(page.getByTestId('notes-copy-status')).toContainText('Prompt copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Output only the questions. Do not wrap them in a code block. Do not use bold.');

  await card.getByText('Show details').click();
  await expect(page.getByTestId('parse-errors')).toBeVisible();
});

test('chatbot output with a code fence, bold and small talk imports cleanly (acceptance sample)', async ({ page }) => {
  await openFresh(page);
  await nav(page, 'Import');
  await page.getByLabel('Paste your reviewer').fill(await readText('e2e/fixtures/chatbot-fenced-bold.txt'));
  await expect(page.getByTestId('parsed-count')).toHaveText('2');
  await expect(page.getByTestId('parse-errors')).toHaveCount(0);
  await expect(page.getByLabel('Deck title')).toHaveValue('Hema');
});
