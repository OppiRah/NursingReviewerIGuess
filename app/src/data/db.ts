/**
 * IndexedDB schema via Dexie. Every version bump needs an upgrade() and a test
 * (tests/unit/migration.test.ts). CURRENT_SCHEMA_VERSION in domain/backup.ts must match.
 */
import Dexie, { type EntityTable, type Transaction } from 'dexie';
import { deriveV2Fields, latestReviewByItem } from '../domain/migrations';
import type { Deck, Item, Review, Setting } from '../domain/types';

export const DB_NAME = 'nursing-reviewer';

export const SCHEMA_V1 = {
  decks: 'id, createdAt',
  items: 'id, deckId, dueAt',
  reviews: '++id, itemId, deckId, at',
  settings: 'key',
};

/** v2 (BUILD-002): items gain lastGrade (mistakes mode) and flagged ("Report wrong"). */
export const SCHEMA_V2 = {
  ...SCHEMA_V1,
  items: 'id, deckId, dueAt, lastGrade',
};

export async function upgradeToV2(tx: Transaction): Promise<void> {
  const latest = latestReviewByItem((await tx.table('reviews').toArray()) as Review[]);
  await tx
    .table('items')
    .toCollection()
    .modify((it: Record<string, unknown>) => {
      Object.assign(it, deriveV2Fields(it, latest));
    });
}

export class ReviewerDB extends Dexie {
  decks!: EntityTable<Deck, 'id'>;
  items!: EntityTable<Item, 'id'>;
  reviews!: EntityTable<Review, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name: string = DB_NAME, maxVersion = 2) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    if (maxVersion >= 2) this.version(2).stores(SCHEMA_V2).upgrade(upgradeToV2);
  }
}

let instance: ReviewerDB | null = null;
export function getDb(): ReviewerDB {
  instance ??= new ReviewerDB();
  return instance;
}
