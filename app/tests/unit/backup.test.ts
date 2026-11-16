import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ReviewerDB } from '../../src/data/db';
import { collectBackupData, createDeck, exportBackup, recordReview, restoreBackup, setSetting, wipeAll } from '../../src/data/repo';
import { CURRENT_SCHEMA_VERSION, sha256Hex, validateBackupText } from '../../src/domain/backup';
import { parseReviewer } from '../../src/domain/parser';
import { createFsrsScheduler, type Scheduler } from '../../src/domain/scheduler';

const NOW = new Date('2026-11-14T10:00:00.000Z');
const TEXT = `# Synthetic\n1. Sample question 1?\na. x\nb. y\nAnswer: a\nRationale: r1\n2. Sample question 2?\na. x\nb. y\nc. z\nAnswer: c\nRationale: r2`;

let db: ReviewerDB;
let s: Scheduler;
let n = 0;

beforeEach(async () => {
  db = new ReviewerDB(`test-backup-${n++}`);
  s = await createFsrsScheduler();
  const deckId = await createDeck(db, { title: 'Synthetic', examDate: '2026-12-01', items: parseReviewer(TEXT).items }, s, NOW);
  const first = (await db.items.where('deckId').equals(deckId).first())!;
  await recordReview(db, first.id, 'good', true, s, NOW);
  await setSetting(db, 'reminderTime', '19:00');
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('backup round-trip', () => {
  it('export → wipe → import restores identical data with an identical checksum', async () => {
    const before = await collectBackupData(db);
    const b1 = await exportBackup(db, NOW);
    expect(b1.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(b1.checksum).toBe(await sha256Hex(JSON.stringify(b1.data)));

    await wipeAll(db);
    expect(await db.items.count()).toBe(0);

    const v = await validateBackupText(JSON.stringify(b1));
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    await restoreBackup(db, v.backup);

    expect(await collectBackupData(db)).toEqual(before);
    const b2 = await exportBackup(db, new Date(NOW.getTime() + 60_000));
    expect(b2.checksum).toBe(b1.checksum);
    expect(await db.reviews.count()).toBe(1);
  });

  it('lastExportAt is device-local: not in the backup, set from the backup on restore', async () => {
    const b = await exportBackup(db, NOW);
    expect(b.data.settings.map((x) => x.key)).not.toContain('lastExportAt');
    await wipeAll(db);
    const v = await validateBackupText(JSON.stringify(b));
    if (!v.ok) throw new Error(v.error);
    await restoreBackup(db, v.backup);
    expect((await db.settings.get('lastExportAt'))?.value).toBe(b.exportedAt);
  });
});

describe('backup validation rejects bad files without touching data', () => {
  const mutate = async (fn: (o: Record<string, unknown>) => void): Promise<string> => {
    const b = JSON.parse(JSON.stringify(await exportBackup(db, NOW))) as Record<string, unknown>;
    fn(b);
    return JSON.stringify(b);
  };

  it('rejects a schemaVersion from a newer app', async () => {
    const v = await validateBackupText(await mutate((o) => (o.schemaVersion = CURRENT_SCHEMA_VERSION + 1)));
    expect(v).toMatchObject({ ok: false });
    if (!v.ok) expect(v.error).toMatch(/newer version/);
  });

  it.each([0, -1, 1.5, '1', null])('rejects schemaVersion %j', async (bad) => {
    const v = await validateBackupText(await mutate((o) => (o.schemaVersion = bad)));
    expect(v.ok).toBe(false);
  });

  it('rejects a checksum mismatch (tampered data)', async () => {
    const v = await validateBackupText(await mutate((o) => ((o.data as { decks: { title: string }[] }).decks[0]!.title = 'tampered')));
    expect(v).toMatchObject({ ok: false });
    if (!v.ok) expect(v.error).toMatch(/checksum/);
  });

  it('rejects non-JSON and foreign JSON', async () => {
    expect((await validateBackupText('not json')).ok).toBe(false);
    expect((await validateBackupText('{"hello":1}')).ok).toBe(false);
    expect((await validateBackupText('[]')).ok).toBe(false);
  });

  /** Mutate `data`, then re-sign it, as a hand-editing user or another tool could. */
  const resigned = async (fn: (data: Record<string, Record<string, unknown>[]>) => void): Promise<string> => {
    const b = JSON.parse(JSON.stringify(await exportBackup(db, NOW))) as { data: Record<string, Record<string, unknown>[]>; checksum: string };
    fn(b.data);
    b.checksum = await sha256Hex(JSON.stringify(b.data));
    return JSON.stringify(b);
  };

  it.each<[string, (d: Record<string, Record<string, unknown>[]>) => void, RegExp]>([
    ['card.state out of range', (d) => ((d.items![0]!.card as Record<string, unknown>).state = 7), /card.state/],
    ['fractional answer index', (d) => (d.items![0]!.answer = [0.5]), /answer invalid/],
    ['empty answer on a single-answer item', (d) => (d.items![0]!.answer = []), /needs ≥2 choices and an answer/],
    ['dueAt out of sync with the card', (d) => (d.items![0]!.dueAt = '2030-01-01T00:00:00.000Z'), /does not match/],
    ['review for a missing item', (d) => (d.reviews![0]!.itemId = 'ghost'), /reviews for items that are not in it/],
    ['invalid reminder time', (d) => d.settings!.push({ key: 'reminderTime', value: '25:00' }), /invalid value for reminderTime|duplicate settings/],
    ['unknown setting', (d) => d.settings!.push({ key: 'evil', value: 1 }), /unknown setting/],
  ])('rejects %s even with a matching checksum', async (_name, fn, msg) => {
    const v = await validateBackupText(await resigned(fn));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(msg);
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('rejects inherited setting name %s (security review #1)', async (key) => {
    const v = await validateBackupText(await resigned((d) => d.settings!.push({ key, value: 'x' })));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/unknown setting/);
  });

  it('drops unknown extra fields from every record before restore (security review #2)', async () => {
    const before = await exportBackup(db, NOW);
    const v = await validateBackupText(
      await resigned((d) => {
        d.decks![0]!.evil = 'x';
        d.items![0]!.evil = 'x';
        (d.items![0]!.card as Record<string, unknown>).evil = 'x';
        d.reviews![0]!.evil = 'x';
      }),
    );
    expect(v.ok).toBe(true);
    if (v.ok) expect(JSON.stringify(v.backup.data)).toBe(JSON.stringify(before.data));
  });

  it('rejects over-long text fields', async () => {
    const v = await validateBackupText(await resigned((d) => (d.decks![0]!.title = 'x'.repeat(201))));
    expect(v.ok).toBe(false);
  });

  it('rejects an export date in the future (security review #3)', async () => {
    const b = JSON.parse(JSON.stringify(await exportBackup(db, NOW))) as { exportedAt: string };
    b.exportedAt = '9999-01-01T00:00:00.000Z';
    const v = await validateBackupText(JSON.stringify(b), NOW);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/future/);
  });

  it('rejects reviews filed under a different deck than their item (security review #5)', async () => {
    const v = await validateBackupText(await resigned((d) => (d.reviews![0]!.deckId = 'other-deck')));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/wrong deck/);
  });

  it('rejects a malformed item even when the checksum matches', async () => {
    const text = await mutate((o) => {
      const data = o.data as { items: Record<string, unknown>[] };
      data.items[0]!.answer = [99];
    });
    const obj = JSON.parse(text) as { data: unknown; checksum: string };
    obj.checksum = await sha256Hex(JSON.stringify(obj.data));
    const v = await validateBackupText(JSON.stringify(obj));
    expect(v).toMatchObject({ ok: false });
    if (!v.ok) expect(v.error).toMatch(/invalid entry in items/);
  });
});
