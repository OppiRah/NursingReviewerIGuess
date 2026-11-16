import { expect, test } from '@playwright/test';
import { importFixture, nav, openFresh, startSession } from './helpers';

const MIXED = 'e2e/fixtures/mixed-deck.txt';

test('SATA, flashcard and priority in one session; mistakes mode; readiness', async ({ page }) => {
  await openFresh(page);
  await importFixture(page, MIXED);
  await expect(page.getByTestId('due-count')).toContainText('4 items due today');
  await expect(page.getByTestId('readiness')).toHaveText('0%');

  await startSession(page);

  // 1. SATA: pick a + c, miss d → wrong, with per-choice marks.
  await expect(page.getByText('Select all that apply', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'a. Red' }).check();
  await page.getByRole('checkbox', { name: 'c. Blue' }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('heading', { name: 'Not quite' })).toBeVisible();
  await expect(page.locator('.mark-missed')).toContainText('d. Green');
  await expect(page.locator('.mark-correct')).toHaveCount(2);
  await expect(page.getByText('Sample SATA rationale.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  // 2. Flashcard: reveal, self-grade.
  await expect(page.getByText('Flashcard', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await expect(page.locator('.back-text')).toHaveText('4');
  await page.getByRole('button', { name: 'Got it' }).click();

  // 3. Priority: badge + prominent rationale.
  await expect(page.getByText('Priority', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'b. The first task' }).click();
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible();
  await expect(page.getByText('Why this comes first')).toBeVisible();
  await expect(page.locator('.rationale-strong')).toContainText('Sample priority rationale.');
  await page.getByRole('button', { name: 'Next' }).click();

  // 4. MCQ wrong.
  await page.getByRole('button', { name: 'a. Cat' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByTestId('summary')).toContainText('You answered 4 items; 2 correct.');
  await page.getByRole('button', { name: 'Back to Today' }).click();

  // Readiness now above zero; two mistakes available.
  await expect(page.getByTestId('readiness')).not.toHaveText('0%');
  await startSession(page, 'Review my mistakes (2)');
  await expect(page.getByRole('heading', { name: 'Question 1 of 2' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'a. Red' }).check();
  await page.getByRole('checkbox', { name: 'c. Blue' }).check();
  await page.getByRole('checkbox', { name: 'd. Green' }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('heading', { name: 'Correct' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'b. Cow' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByTestId('summary')).toContainText('You answered 2 items; 2 correct.');
  await page.getByRole('button', { name: 'Back to Today' }).click();
  await expect(page.getByRole('button', { name: /Review my mistakes/ })).toHaveCount(0);
});

test('deck screen: search, edit an item, report wrong, delete', async ({ page }) => {
  await openFresh(page);
  await importFixture(page, MIXED);
  await nav(page, 'Decks');
  await expect(page.getByText(/4 items · Readiness \(estimated\): 0%/)).toBeVisible();
  await page.getByRole('button', { name: 'Open Mixed Synthetic Deck' }).click();
  await expect(page.getByRole('heading', { name: 'Mixed Synthetic Deck', level: 1 })).toBeVisible();
  await expect(page.getByTestId('item-row')).toHaveCount(4);

  // Search.
  await page.getByLabel('Search items').fill('moo');
  await expect(page.getByTestId('item-row')).toHaveCount(1);
  const row = page.getByTestId('item-row').first();
  await expect(row).toContainText('Answer: b. Cow');

  // Edit: fix a typo and change the answer.
  await row.getByRole('button', { name: /^Edit/ }).click();
  await row.getByLabel('Question').fill('Sample MCQ (edited): which animal says moo?');
  await row.getByLabel('Correct letter(s)').fill('e'); // valid letter, but only 3 choices
  await row.getByRole('button', { name: 'Save changes' }).click();
  await expect(row.getByRole('alert')).toContainText('one of the choices');
  await row.getByLabel('Correct letter(s)').fill('c');
  await row.getByRole('button', { name: 'Save changes' }).click();
  await expect(row).toContainText('Sample MCQ (edited): which animal says moo?');
  await expect(row).toContainText('Answer: c. Duck');

  // Report wrong → flagged in the deck and in the deck list.
  await row.getByRole('button', { name: 'Report wrong' }).click();
  await expect(row).toContainText('Reported wrong');
  await page.reload();
  await nav(page, 'Decks');
  await expect(page.getByText('1 reported wrong')).toBeVisible();
  await page.getByRole('button', { name: 'Open Mixed Synthetic Deck' }).click();
  await page.getByLabel(/Only items reported wrong/).check();
  await expect(page.getByTestId('item-row')).toHaveCount(1);
  await expect(page.getByTestId('item-row').first()).toContainText('(edited)');
  await page.getByLabel(/Only items reported wrong/).uncheck();

  // Delete with confirmation.
  await page.getByTestId('item-row').first().getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByTestId('item-row')).toHaveCount(3);
  await nav(page, 'Today');
  await expect(page.getByTestId('due-count')).toContainText('3 items due today');
});
