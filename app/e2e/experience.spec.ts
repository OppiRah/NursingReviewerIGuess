import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { importFixture, localDatePlus, nav, openFresh, startSession } from './helpers';

async function putSetting(page: Page, key: string, value: unknown): Promise<void> {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('nursing-reviewer');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: k, value: v });
          tx.oncomplete = () => {
            req.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, value] as const,
  );
}

async function expectNoSeriousA11y(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

test('onboarding: 3 skippable screens, shown once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your reviewers, as daily practice' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'How to import' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy BYO-AI prompt' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Set your exam date' })).toBeVisible();
  await page.getByRole('button', { name: 'Import my first reviewer' }).click();
  await expect(page.getByRole('heading', { name: 'Import a reviewer', level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
});

test('mascot moments: start, recovery after 3 wrong, end; never mid-question; gentle streak', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await expect(page.getByTestId('streak')).toHaveText('Finish a session to start a streak.');
  await startSession(page);

  // Three wrong answers in a row (first choice is wrong for items 1–3 of the fixture).
  for (let q = 1; q <= 3; q++) {
    await expect(page.getByRole('heading', { name: `Question ${q} of 5` })).toBeVisible();
    await expect(page.locator('.mascot-moment')).toHaveCount(0);
    await page.locator('.choices button').first().click();
    await expect(page.getByRole('heading', { name: 'Not quite' })).toBeVisible();
    await expect(page.locator('.mascot-moment')).toHaveCount(0);
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.getByTestId('mascot-recovery')).toContainText('Mistakes are information — let’s go again.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Question 4 of 5' })).toBeVisible();
  for (let q = 4; q <= 5; q++) {
    await page.locator('.choices button').first().click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.getByTestId('mascot-end')).toBeVisible();
  await page.getByRole('button', { name: 'Back to Today' }).click();
  await expect(page.getByTestId('streak')).toHaveText('1 day in a row');
});

test('welcome back after 3+ days away, with neutral streak copy', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await expect(page.getByTestId('welcome-back')).toHaveCount(0);
  await putSetting(page, 'sessionDays', [localDatePlus(-6), localDatePlus(-5)]);
  await page.reload();
  await expect(page.getByTestId('welcome-back')).toContainText('Welcome back!');
  await expect(page.getByTestId('streak')).toHaveText('A fresh streak can start today.');
  await expect(page.locator('body')).not.toContainText(/lost|broke|shame|failed/i);
});

test('mascot can be switched off; the loop still works', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await nav(page, 'Settings');
  await page.getByLabel('Show the mascot between sessions').uncheck();
  await nav(page, 'Today');
  await page.getByRole('button', { name: 'Start review' }).click();
  await expect(page.getByRole('heading', { name: 'Question 1 of 5' })).toBeVisible();
  await expect(page.locator('.mascot-moment')).toHaveCount(0);
});

test('dark mode follows the system and can be overridden', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openFresh(page);
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const darkBg = await bg();
  expect(darkBg).toBe('rgb(21, 17, 29)');
  await nav(page, 'Settings');
  await page.getByLabel('Light').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await bg()).toBe('rgb(247, 245, 251)');
  await page.reload();
  expect(await bg()).toBe('rgb(247, 245, 251)');
  await nav(page, 'Settings');
  await page.getByLabel('Match my phone').check();
  expect(await bg()).toBe(darkBg);
});

test('360px wide: no horizontal scroll, touch targets ≥ 44px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openFresh(page);
  await importFixture(page);
  const check = async (where: string): Promise<void> => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${where}: horizontal overflow`).toBeLessThanOrEqual(0);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, input:not(.sr-only), select, textarea, summary, label.btn')]
        .filter((el) => el.offsetParent !== null)
        // A checkbox/radio inside a <label> is tapped via the whole label, so the label is the target.
        .map((el) => (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') && el.closest('label')) || el)
        .map((el) => ({ el: el.outerHTML.slice(0, 60), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width }))
        .filter((r) => r.h < 44 || r.w < 44),
    );
    expect(small, `${where}: small touch targets`).toEqual([]);
  };
  await check('Today');
  await nav(page, 'Import');
  await check('Import');
  await nav(page, 'Settings');
  await check('Settings');
  await nav(page, 'Today');
  await startSession(page);
  await check('Session question');
  await page.locator('.choices button').first().click();
  await check('Session feedback');
});

test('accessibility: no serious or critical axe violations (light and dark)', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await openFresh(page);
    if (scheme === 'light') await importFixture(page);
    await expectNoSeriousA11y(page, `Today/${scheme}`);
    await nav(page, 'Import');
    await page.getByLabel('Paste your reviewer').fill('1. Sample?\na. x\nb. y\nAnswer: c');
    await expectNoSeriousA11y(page, `Import/${scheme}`);
    await nav(page, 'Settings');
    await expectNoSeriousA11y(page, `Settings/${scheme}`);
    await nav(page, 'Decks');
    await expectNoSeriousA11y(page, `Decks/${scheme}`);
    await nav(page, 'Today');
    await startSession(page);
    await expectNoSeriousA11y(page, `Session question/${scheme}`);
    await page.locator('.choices button').first().click();
    await expectNoSeriousA11y(page, `Session feedback/${scheme}`);
    await page.getByRole('button', { name: 'End session' }).click();
  }
});

test('keyboard only: complete a whole session without the mouse', async ({ page }) => {
  await openFresh(page);
  await importFixture(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  const tabTo = async (name: RegExp, max = 25): Promise<void> => {
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      const label = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText ?? '');
      if (name.test(label.trim())) return;
    }
    throw new Error(`Could not reach ${name} with Tab`);
  };

  // Navigating moves focus to the new screen's heading, even when it loads data first.
  await tabTo(/^Decks$/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Decks', level: 1 })).toBeFocused();
  await tabTo(/^Today$/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeFocused();

  await tabTo(/^Start review$/);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Begin' })).toBeFocused();
  await page.keyboard.press('Enter');

  for (let q = 1; q <= 5; q++) {
    await expect(page.getByRole('heading', { name: `Question ${q} of 5` })).toBeVisible();
    await tabTo(/^b\./);
    await page.keyboard.press('Enter');
    await expect(page.locator('.feedback h3')).toBeFocused();
    await tabTo(/^Next$/);
    await page.keyboard.press('Space');
    if (await page.getByRole('button', { name: 'Continue' }).isVisible().catch(() => false)) {
      await page.keyboard.press('Enter');
    }
  }
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeFocused();
  await tabTo(/^Back to Today$/);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('due-count')).toContainText('0 items due today');
});
