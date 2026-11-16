/**
 * Backup file format: one JSON object with a schemaVersion and a SHA-256 checksum
 * over the canonical JSON of `data`. Everything is validated before anything is written.
 */
import { isDateStr } from './dates';
import { deriveV2Fields, latestReviewByItem } from './migrations';
import type { Deck, Item, Review, Setting } from './types';

export const BACKUP_APP_ID = 'nursing-reviewer';
/** Must equal the Dexie schema version (data/db.ts). */
export const CURRENT_SCHEMA_VERSION = 2;
export const MAX_BACKUP_BYTES = 15 * 1024 * 1024;
/** Text limits for restored records (imports are already capped at 2 MB per paste). */
export const MAX_TITLE = 200;
export const MAX_TEXT = 20_000;
export const MAX_ITEMS = 20_000;
export const MAX_REVIEWS = 500_000;

export interface BackupData {
  decks: Deck[];
  items: Item[];
  reviews: Review[];
  settings: Setting[];
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  checksum: string;
  data: BackupData;
}

export type ValidationResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildBackup(data: BackupData, now: Date): Promise<BackupFile> {
  return {
    app: BACKUP_APP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    checksum: await sha256Hex(JSON.stringify(data)),
    data,
  };
}

export const BACKUP_NUDGE_DAYS = 7;

/** One rule for every screen: nudge when never exported, or more than 7 days ago. */
export function needsBackupNudge(lastExportAt: string | null, now: Date): boolean {
  if (!lastExportAt) return true;
  return (now.getTime() - Date.parse(lastExportAt)) / 86_400_000 > BACKUP_NUDGE_DAYS;
}

export function backupFileName(now: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `reviewer-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

// ---------- shape validation ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const ITEM_TYPES = ['mcq', 'sata', 'priority', 'flashcard'];
const GRADES = ['again', 'good', 'easy'];

const isCount = (v: unknown): v is number => isNum(v) && Number.isInteger(v) && v >= 0;

function checkCard(c: unknown): string | null {
  if (!isObj(c)) return 'card is missing';
  for (const k of ['stability', 'difficulty', 'scheduledDays']) {
    if (!isNum(c[k]) || (c[k] as number) < 0) return `card.${k} is not a valid number`;
  }
  for (const k of ['reps', 'lapses', 'learningStep']) {
    if (!isCount(c[k])) return `card.${k} is not a whole number`;
  }
  if (!isCount(c.state) || c.state > 3) return 'card.state is not 0–3';
  if (!isIso(c.dueAt)) return 'card.dueAt is not a date';
  if (c.lastReviewAt !== null && !isIso(c.lastReviewAt)) return 'card.lastReviewAt is not a date';
  return null;
}

export function checkDeck(d: unknown): string | null {
  if (!isObj(d)) return 'not an object';
  if (!isStr(d.id) || !d.id) return 'id missing';
  if (!isStr(d.title) || d.title.length > MAX_TITLE) return 'title missing or too long';
  if (d.examDate !== null && !isDateStr(d.examDate)) return 'examDate invalid';
  if (!isIso(d.createdAt)) return 'createdAt invalid';
  return null;
}

/** Item checks shared by all schema versions; version-specific fields are checked in validateItem. */
function checkItemBase(it: unknown): string | null {
  if (!isObj(it)) return 'not an object';
  if (!isStr(it.id) || !it.id) return 'id missing';
  if (!isStr(it.deckId)) return 'deckId missing';
  if (!isStr(it.type) || !ITEM_TYPES.includes(it.type)) return 'type invalid';
  if (!isStr(it.question) || it.question.length > MAX_TEXT) return 'question missing or too long';
  if (!Array.isArray(it.choices) || it.choices.length > 8 || !it.choices.every((c) => isStr(c) && c.length <= MAX_TEXT)) return 'choices invalid';
  const nChoices = (it.choices as string[]).length;
  if (!Array.isArray(it.answer) || !it.answer.every((n) => isCount(n) && n < nChoices)) return 'answer invalid';
  if (new Set(it.answer).size !== it.answer.length) return 'answer has duplicates';
  if (!isStr(it.back) || it.back.length > MAX_TEXT) return 'back missing or too long';
  if (it.type === 'flashcard') {
    if (nChoices !== 0 || it.answer.length !== 0 || !it.back) return 'flashcard shape invalid';
  } else {
    if (nChoices < 2 || it.answer.length < 1) return 'needs ≥2 choices and an answer';
    if (it.type !== 'sata' && it.answer.length !== 1) return 'single-answer item has several answers';
  }
  if (!isStr(it.rationale) || it.rationale.length > MAX_TEXT) return 'rationale missing or too long';
  if (!isCount(it.position)) return 'position missing';
  if (it.firstReviewedAt !== null && !isIso(it.firstReviewedAt)) return 'firstReviewedAt invalid';
  if (!isIso(it.dueAt)) return 'dueAt invalid';
  if (!isIso(it.createdAt)) return 'createdAt invalid';
  const cardErr = checkCard(it.card);
  if (cardErr) return cardErr;
  if ((it.card as Record<string, unknown>).dueAt !== it.dueAt) return 'dueAt does not match card.dueAt';
  return null;
}

export function checkItem(it: unknown, version: number): string | null {
  const base = checkItemBase(it);
  if (base || version < 2) return base;
  const v2 = it as Record<string, unknown>;
  if (typeof v2.flagged !== 'boolean') return 'flagged invalid';
  if (v2.lastGrade !== null && !(isStr(v2.lastGrade) && GRADES.includes(v2.lastGrade))) return 'lastGrade invalid';
  return null;
}

export function checkReview(r: unknown): string | null {
  if (!isObj(r)) return 'not an object';
  if (r.id !== undefined && !isNum(r.id)) return 'id invalid';
  if (!isStr(r.itemId) || !isStr(r.deckId)) return 'itemId/deckId missing';
  if (!isIso(r.at)) return 'at invalid';
  if (!isStr(r.grade) || !GRADES.includes(r.grade)) return 'grade invalid';
  if (typeof r.correct !== 'boolean') return 'correct invalid';
  return null;
}

/** Known settings and their value checks. Unknown keys are rejected so nothing unvetted is written. */
const SETTING_CHECKS: Record<string, (v: unknown) => boolean> = {
  reminderTime: (v) => isStr(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
  reminderUid: (v) => isStr(v) && v.length > 0 && v.length < 200,
  onboarded: (v) => typeof v === 'boolean',
  mascot: (v) => typeof v === 'boolean',
  sessionDays: (v) => Array.isArray(v) && v.length <= 5000 && v.every(isDateStr),
};

function checkSetting(s: unknown): string | null {
  if (!isObj(s) || !isStr(s.key)) return 'key missing';
  // Own keys only: inherited names like "constructor" or "__proto__" must not match a check.
  const check = Object.hasOwn(SETTING_CHECKS, s.key) ? SETTING_CHECKS[s.key] : undefined;
  if (!check) return `unknown setting "${s.key.slice(0, 40)}"`;
  if (!check(s.value)) return `invalid value for ${s.key}`;
  return null;
}

const DECK_KEYS = new Set(['id', 'title', 'examDate', 'createdAt']);
const ITEM_KEYS = new Set(['id', 'deckId', 'type', 'question', 'choices', 'answer', 'back', 'rationale', 'card', 'dueAt', 'position', 'firstReviewedAt', 'lastGrade', 'flagged', 'createdAt']);
const CARD_KEYS = new Set(['stability', 'difficulty', 'state', 'reps', 'lapses', 'scheduledDays', 'learningStep', 'dueAt', 'lastReviewAt']);
const REVIEW_KEYS = new Set(['id', 'itemId', 'deckId', 'at', 'grade', 'correct']);
const SETTING_KEYS = new Set(['key', 'value']);

/** Copy only known keys, in their original order (keeps checksums of our own exports stable). */
function pick<T>(obj: unknown, keys: Set<string>): T {
  const src = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(src)) if (keys.has(k)) out[k] = src[k];
  return out as T;
}

/** Drop any extra fields a hand-edited or hostile backup might carry, so they never reach the database. */
export function stripUnknownFields(d: BackupData): BackupData {
  return {
    decks: d.decks.map((x) => pick<Deck>(x, DECK_KEYS)),
    items: d.items.map((x) => {
      const it = pick<Item>(x, ITEM_KEYS);
      return { ...it, card: pick<Item['card']>(it.card, CARD_KEYS) };
    }),
    reviews: d.reviews.map((x) => pick<Review>(x, REVIEW_KEYS)),
    settings: d.settings.map((x) => pick<Setting>(x, SETTING_KEYS)),
  };
}

/** Upgrade older backup data to the current schema. Each step is pure and tested. */
export function migrateBackupData(fromVersion: number, data: BackupData): BackupData {
  let out = data;
  if (fromVersion < 2) {
    const latest = latestReviewByItem(out.reviews);
    out = { ...out, items: out.items.map((it) => ({ ...it, ...deriveV2Fields(it as unknown as Record<string, unknown>, latest) })) };
  }
  return out;
}

/**
 * Parse and validate a backup file's text. Returns the fully checked (and migrated)
 * backup, or a friendly error. Nothing here touches the database.
 */
export async function validateBackupText(text: string, now: Date = new Date()): Promise<ValidationResult> {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) return { ok: false, error: 'This backup file is larger than 15 MB, which is more than this app ever exports.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't a valid backup (it is not JSON)." };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP_ID) return { ok: false, error: "This file isn't a backup from this app." };
  const v = raw.schemaVersion;
  if (!isNum(v) || !Number.isInteger(v) || v < 1) return { ok: false, error: 'This backup has an unknown schema version.' };
  if (v > CURRENT_SCHEMA_VERSION) return { ok: false, error: `This backup is from a newer version of the app (schema ${v}). Update the app first.` };
  if (!isIso(raw.exportedAt) || !isStr(raw.checksum) || !isObj(raw.data)) return { ok: false, error: 'This backup is missing required fields.' };
  // A backup from the future would silence the backup reminder forever.
  if (Date.parse(raw.exportedAt) > now.getTime() + 86_400_000) return { ok: false, error: 'This backup has an export date in the future, so it was not restored.' };

  const data = raw.data;
  const actual = await sha256Hex(JSON.stringify(data));
  if (actual !== raw.checksum) return { ok: false, error: 'This backup is damaged (checksum mismatch). Your current data was not changed.' };

  for (const key of ['decks', 'items', 'reviews', 'settings'] as const) {
    if (!Array.isArray(data[key])) return { ok: false, error: `This backup is missing its ${key} list.` };
  }
  const lists = data as unknown as Record<'decks' | 'items' | 'reviews' | 'settings', unknown[]>;
  const checks: [keyof BackupData, (x: unknown) => string | null][] = [
    ['decks', checkDeck],
    ['items', (x) => checkItem(x, v)],
    ['reviews', checkReview],
    ['settings', checkSetting],
  ];
  for (const [key, fn] of checks) {
    const list = lists[key];
    for (let i = 0; i < list.length; i++) {
      const err = fn(list[i]);
      if (err) return { ok: false, error: `This backup has an invalid entry in ${key} (#${i + 1}: ${err}). Your current data was not changed.` };
    }
  }
  const decks = lists.decks as Deck[];
  const items = lists.items as Item[];
  const reviews = lists.reviews as Review[];
  const deckIds = new Set(decks.map((d) => d.id));
  const itemIds = new Set(items.map((i) => i.id));
  const reject = (msg: string): ValidationResult => ({ ok: false, error: `${msg} Your current data was not changed.` });
  if (deckIds.size !== decks.length || itemIds.size !== items.length) return reject('This backup has duplicate decks or items.');
  if (items.some((it) => !deckIds.has(it.deckId))) return reject('This backup has items that belong to no deck.');
  if (reviews.some((r) => !itemIds.has(r.itemId))) return reject('This backup has reviews for items that are not in it.');
  const itemDeck = new Map(items.map((i) => [i.id, i.deckId]));
  if (reviews.some((r) => itemDeck.get(r.itemId) !== r.deckId)) return reject('This backup has reviews filed under the wrong deck.');
  if (items.length > MAX_ITEMS || reviews.length > MAX_REVIEWS) return reject('This backup is larger than this app supports.');
  const reviewIds = reviews.map((r) => r.id).filter((id) => id !== undefined);
  if (new Set(reviewIds).size !== reviewIds.length) return reject('This backup has duplicate review entries.');
  const settingKeys = (lists.settings as Setting[]).map((s) => s.key);
  if (new Set(settingKeys).size !== settingKeys.length) return reject('This backup has duplicate settings.');

  const migrated = stripUnknownFields(migrateBackupData(v, data as unknown as BackupData));
  // Re-check migrated items against the current schema, so nothing invalid can reach the database.
  for (let i = 0; i < migrated.items.length; i++) {
    const err = checkItem(migrated.items[i], CURRENT_SCHEMA_VERSION);
    if (err) return reject(`This backup has an invalid entry in items after upgrading it (#${i + 1}: ${err}).`);
  }
  return {
    ok: true,
    backup: { app: BACKUP_APP_ID, schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: raw.exportedAt, checksum: raw.checksum, data: migrated },
  };
}
