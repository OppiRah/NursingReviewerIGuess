/** AUDIT-001 browser checks: axe on every screen in both themes (all impacts), and a full backup round trip into a fresh profile. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { importFixture, nav, openFresh, startSession } from '../../../e2e/helpers';

const found: string[] = [];
async function axe(page: Page, label: string): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
  for (const v of r.violations) found.push(`${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
}

/** Every row of every store, read straight from IndexedDB. */
async function dump(page: Page): Promise<Record<string, unknown[]>> {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown[]>>((resolve, reject) => {
        const req = indexedDB.open('nursing-reviewer');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const out: Record<string, unknown[]> = {};
          const names = ['decks', 'items', 'reviews', 'settings'];
          const tx = db.transaction(names, 'readonly');
          for (const n of names) {
            const g = tx.objectStore(n).getAll();
            g.onsuccess = () => (out[n] = g.result);
          }
          tx.oncomplete = () => {
            db.close();
            resolve(out);
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test('axe: every screen, light and dark, all impact levels (report only)', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    if (scheme === 'light') {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await axe(page, `Onboarding 1/${scheme}`);
      await page.getByRole('button', { name: 'Next' }).click();
      await axe(page, `Onboarding 2/${scheme}`);
      await page.getByRole('button', { name: 'Next' }).click();
      await axe(page, `Onboarding 3/${scheme}`);
      await page.getByRole('button', { name: 'Skip intro' }).click();
      await axe(page, `Today empty/${scheme}`);
      await importFixture(page);
    }
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
    await axe(page, `Today/${scheme}`);
    await nav(page, 'Import');
    await axe(page, `Import empty/${scheme}`);
    await page.getByLabel('Or choose a file (.pdf, .docx, .txt)').setInputFiles('e2e/fixtures/prose-notes.txt');
    await expect(page.getByTestId('notes-card')).toBeVisible();
    await axe(page, `Import notes card/${scheme}`);
    await page.getByLabel('Paste your reviewer').fill('1. Sample?\na. x\nb. y\nAnswer: c');
    await axe(page, `Import errors/${scheme}`);
    await page.getByLabel('Paste your reviewer').fill('1. Sample?\na. x\nb. y\nAnswer: a\nRationale: r');
    await axe(page, `Import preview/${scheme}`);
    await page.getByLabel('Paste your reviewer').fill('');
    await nav(page, 'Settings');
    await page.getByRole('button', { name: 'Wipe all data' }).click();
    await axe(page, `Settings + wipe confirm/${scheme}`);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await nav(page, 'Decks');
    await axe(page, `Decks/${scheme}`);
    await page.getByRole('button', { name: /^Open / }).first().click();
    await axe(page, `Deck detail/${scheme}`);
    await page.getByRole('button', { name: /^Edit:/ }).first().click();
    await axe(page, `Item editor/${scheme}`);
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await nav(page, 'Today');
    await page.getByRole('button', { name: 'Start review' }).click();
    await axe(page, `Session intro/${scheme}`);
    await page.getByRole('button', { name: 'Begin' }).click();
    await axe(page, `Session question/${scheme}`);
    await page.locator('.choices button').first().click();
    await axe(page, `Session feedback/${scheme}`);
    await page.goBack();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await axe(page, `Leave dialog/${scheme}`);
    await page.getByRole('button', { name: 'Leave session' }).click();
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  }
  console.log(found.length ? `AXE VIOLATIONS (${found.length}):\n${found.join('\n')}` : 'AXE: no violations at any impact level');
  expect(found.filter((f) => /\((serious|critical)\)/.test(f))).toEqual([]);
});

test('backup: export on one profile, restore on a fresh profile, compare every row', async ({ page, browser }) => {
  await openFresh(page);
  await importFixture(page);
  await startSession(page);
  for (let i = 0; i < 3; i++) {
    await page.locator('.choices button, .choices input').first().click();
    const check = page.getByRole('button', { name: 'Check answer' });
    if (await check.isVisible().catch(() => false)) await check.click();
    const show = page.getByRole('button', { name: 'Show answer' });
    if (await show.isVisible().catch(() => false)) await show.click();
    await page.getByRole('button', { name: /^(Next|Got it)$/ }).click();
    const cont = page.getByRole('button', { name: 'Continue' });
    if (await cont.isVisible().catch(() => false)) await cont.click();
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await nav(page, 'Settings');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  const path = await download.path();
  await expect(page.getByRole('status')).toContainText('Backup file created');
  const before = await dump(page);
  expect(before.reviews?.length).toBe(3);

  const ctx = await browser.newContext(); // a different "phone"
  const p2 = await ctx.newPage();
  await p2.goto('/');
  await p2.getByRole('button', { name: 'Skip intro' }).click();
  await p2.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Settings' }).click();
  await p2.getByTestId('backup-file').setInputFiles(path);
  await p2.getByRole('button', { name: 'Replace my data with this backup' }).click();
  await expect(p2.getByRole('status')).toContainText('Backup restored');
  const after = await dump(p2);
  const local = new Set(['lastExportAt', 'reminderUid']);
  const strip = (d: Record<string, unknown[]>): Record<string, unknown[]> => ({ ...d, settings: (d.settings as { key: string }[]).filter((s) => !local.has(s.key)) });
  expect(strip(after)).toEqual(strip(before));
  await ctx.close();
});
