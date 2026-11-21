/** BETA-PREP: "Copy feedback info" never contains study content. */
import { afterEach, describe, expect, it } from 'vitest';
import { ReviewerDB } from '../../src/data/db';
import { createDeck, recordReview } from '../../src/data/repo';
import { buildFeedbackInfo, collectContentWords, collectFeedbackCounts, sanitizeError } from '../../src/domain/feedback';
import { parseReviewer } from '../../src/domain/parser';
import { createFsrsScheduler } from '../../src/domain/scheduler';

const NOW = new Date(2026, 10, 16, 9, 0, 0);
const SECRET = ['Zebrafish', 'Quokka', 'Wombat', 'Axolotl', 'Narwhal', 'Pangolin', 'Okapi'];
const TEXT = `1. Which ${SECRET[1]} sample?\na. ${SECRET[2]}\nb. ${SECRET[3]}\nAnswer: a\nRationale: ${SECRET[4]} reason.\n---\nQ: ${SECRET[5]} front?\nA: ${SECRET[6]} back`;
let db: ReviewerDB | null = null;
afterEach(async () => {
  db?.close();
  await db?.delete();
  db = null;
});

describe('feedback info', () => {
  it('has version, platform, install state, counts, last error and storage state, and no content', async () => {
    db = new ReviewerDB(`fb-${Date.now()}`);
    const s = await createFsrsScheduler();
    const deckId = await createDeck(db, { title: `${SECRET[0]} Deck`, examDate: '2026-12-01', items: parseReviewer(TEXT).items }, s, NOW);
    const first = (await db.items.where('deckId').equals(deckId).toArray())[0];
    if (first) await recordReview(db, first.id, 'good', true, s, NOW);
    const counts = await collectFeedbackCounts(db);
    expect(counts).toEqual({ decks: 1, items: 2, reviews: 1 });

    const info = buildFeedbackInfo({
      version: '0.2.0',
      buildDate: '2026-11-16',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1',
      standalone: true,
      counts,
      lastError: `Couldn't parse "Which ${SECRET[1]} sample?" in ${SECRET[0]} Deck`,
      persisted: false,
      contentWords: await collectContentWords(db),
    });
    expect(info).toContain('Version: 0.2.0 (built 2026-11-16)');
    expect(info).toContain('iPhone');
    expect(info).toContain('Installed: yes');
    expect(info).toContain('Decks: 1 · Items: 2 · Reviews: 1');
    expect(info).toContain('Storage protected: no');
    expect(info).toContain('Last error:');
    for (const word of SECRET) expect(info, `must not contain "${word}"`).not.toContain(word);
    expect(info.split('\n').length).toBeLessThanOrEqual(8);
  });

  it('error text is reduced to its shape: quoted text and long tails are dropped', () => {
    expect(sanitizeError('Item "Secret question text" not found')).toBe('Item "…" not found');
    expect(sanitizeError('x'.repeat(500)).length).toBeLessThanOrEqual(121);
    expect(sanitizeError(null)).toBe('none');
  });

  it('says "none" when there was no error and "unknown" when storage state is unavailable', () => {
    const info = buildFeedbackInfo({ version: '0.2.0', buildDate: 'd', userAgent: 'ua', standalone: false, counts: { decks: 0, items: 0, reviews: 0 }, lastError: null, persisted: null });
    expect(info).toContain('Last error: none');
    expect(info).toContain('Installed: no');
    expect(info).toContain('Storage protected: unknown');
  });
});
